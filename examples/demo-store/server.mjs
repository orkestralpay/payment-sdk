// Demo store: a merchant integration example for sandbox and presentations.
// Checkout page -> the store BACKEND creates the PaymentIntent with the merchant credentials -> Orkestral checkout.
// The merchant secret and the order total stay on this server; the browser only sends item ids, quantities and
// buyer data. Not production code: no persistence, no real catalog.
// Usage: see README.md (configuration by environment variables).
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { normalize } from 'node:path';

export function readConfig(env = process.env) {
	const port = Number(env.PORT || 4030);
	const config = {
		port,
		publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
		apiUrl: (env.ORKESTRAL_API_URL || '').replace(/\/+$/, ''),
		authUrl: (env.ORKESTRAL_AUTH_URL || env.ORKESTRAL_API_URL || '').replace(/\/+$/, ''),
		checkoutUrl: (env.CHECKOUT_URL || '').replace(/\/+$/, ''),
		merchantId: env.MERCHANT_ID || '',
		clientId: env.MERCHANT_CLIENT_ID || env.MERCHANT_ID || '',
		clientSecret: env.MERCHANT_CLIENT_SECRET || '',
		username: env.MERCHANT_API_USERNAME || '',
		password: env.MERCHANT_API_PASSWORD || '',
		// Optional, local only: the PSP mock control URL enables the scenario shortcuts (decline, timeout)
		pspMockUrl: (env.PSP_MOCK_URL || '').replace(/\/+$/, '')
	};
	const missing = ['apiUrl', 'checkoutUrl', 'merchantId', 'clientSecret', 'username', 'password'].filter((k) => !config[k]);
	if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
	return config;
}

// Catalogo em centavos (o total e calculado aqui; o navegador so manda ids e quantidades)
const PRODUCTS = {
	cafe: { name: 'Café especial 250g', detail: 'Torra média, grãos', price: 4990 },
	caneca: { name: 'Caneca esmaltada', detail: '350 ml, verde', price: 5900 },
	coador: { name: 'Coador de pano', detail: 'Algodão, tamanho 103', price: 2490 }
};
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const SAMPLE = { name: 'Joao', surname: 'Silva', document: '529.982.247-25', email: 'joao.silva@example.com', phone: '(11) 99999-9999',
	postal_code: '01001-000', street: 'Praça da Sé', number: '100', details: 'Apto 12', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' };
// Atalhos de demonstracao: ajustam o mock da Cielo e abrem o checkout de um pedido com os dados de exemplo
const SCENARIOS = {
	aprovado: { label: 'Pagamento aprovado', mode: 'ok' },
	recusado: { label: 'Cartão recusado pela Cielo', mode: 'decline' },
	'sem-resposta': { label: 'Cielo sem resposta (resultado incerto, ~20s)', mode: 'timeout' }
};

export const brl = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function validCpf(cpf) {
	if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
	const check = (len) => {
		const sum = [...cpf.slice(0, len)].reduce((s, d, i) => s + Number(d) * (len + 1 - i), 0);
		return ((sum * 10) % 11) % 10;
	};
	return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

// Validacao no servidor da loja (fronteira de confianca): o navegador pode mandar qualquer coisa
export function readOrder(form) {
	const cart = Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, Math.max(0, Math.min(10, Number(form[`qty_${id}`]) | 0))]));
	const amount = Object.entries(cart).reduce((sum, [id, qty]) => sum + PRODUCTS[id].price * qty, 0);
	const f = Object.fromEntries(Object.keys(SAMPLE).map((k) => [k, String(form[k] ?? '').trim()]));
	const errors = [];
	if (amount <= 0) errors.push('Adicione pelo menos um produto.');
	for (const k of ['name', 'surname', 'street', 'number', 'neighborhood', 'city']) if (!f[k]) errors.push('Preencha todos os campos obrigatórios.');
	if (!validCpf(digits(f.document))) errors.push('CPF inválido.');
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) errors.push('E-mail inválido.');
	if (!/^\d{10,11}$/.test(digits(f.phone))) errors.push('Telefone inválido (DDD + número).');
	if (!/^\d{8}$/.test(digits(f.postal_code))) errors.push('CEP inválido.');
	if (!UFS.includes(f.state)) errors.push('Selecione o estado.');
	return { cart, amount, f, errors: [...new Set(errors)] };
}

async function merchantToken(config) {
	const r = await fetch(`${config.authUrl}/oauth2/token`, {
		method: 'POST',
		headers: { Authorization: 'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64') },
		body: new URLSearchParams({ username: config.username, password: config.password, grant_type: 'password' })
	});
	if (!r.ok) throw new Error(`login do merchant: HTTP ${r.status}`);
	return (await r.json()).access_token;
}

async function createIntent(config, { cart, amount, f }, ip) {
	const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => `${q}x ${PRODUCTS[id].name}`).join(', ');
	const r = await fetch(`${config.apiUrl}/v1/payment-intents/${config.merchantId}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${await merchantToken(config)}`, IP: ip, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			amount, currency: 'BRL', payment_method: 'CREDIT_CARD', description: `Torra & Cia: ${items}`.slice(0, 200),
			expiration: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 19),
			origin_url: config.publicUrl, ok_url: `${config.publicUrl}/obrigado`, error_url: `${config.publicUrl}/`,
			client: {
				name: f.name, surname: f.surname, document_type: 'CPF', document_number: digits(f.document),
				telephone: digits(f.phone), email: f.email,
				billing_address: { street: f.street, number: f.number, neighborhood: f.neighborhood, country: 'BR', state: f.state,
					city: f.city, details: f.details || '-', postal_code: digits(f.postal_code) }
			}
		})
	});
	const body = await r.json();
	if (r.status !== 201) throw new Error(`HTTP ${r.status} ${body.message ?? ''}`);
	console.log(`intent ${body.payment_intent_id} ${brl(amount)} (${items})`);
	return body.payment_intent_id;
}

const page = (title, inner) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
:root{--bg:#f4f1ec;--card:#fff;--line:#e3dcd3;--fg:#2b2420;--muted:#7a6e66;--accent:#3d5a40;--bad:#a3312a}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg)}
header{background:var(--accent);color:#fff;padding:14px 16px}header div{max-width:1040px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:12px}
header b{font:600 20px Georgia,serif}header span{font-size:13px;opacity:.85}
main{max-width:1040px;margin:0 auto;padding:24px 16px 48px}
h1{font:600 28px/1.2 Georgia,serif;margin:0 0 20px}h2{font:600 18px/1.3 Georgia,serif;margin:0 0 12px}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:20px;margin-bottom:16px}
.row{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.c2{grid-column:span 2}.c3{grid-column:span 3}.c4{grid-column:span 4}.c6{grid-column:span 6}
label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted)}
input,select{font:inherit;color:var(--fg);padding:9px 10px;border:1px solid #cfc6bb;border-radius:6px;background:#fff;width:100%}
input:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #9cc5a1;outline-offset:1px}
.item{display:grid;grid-template-columns:minmax(0,1fr) 64px;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.item b{display:block;font-size:15px}.item span{color:var(--muted);font-size:13px}
.sum{display:flex;justify-content:space-between;margin:6px 0;font-size:15px}.sum.total{font-weight:700;font-size:18px;margin-top:12px}
.pay{display:flex;align-items:center;gap:10px;border:2px solid var(--accent);border-radius:8px;padding:12px;background:#f2f6f2}
.pay svg{flex:none}.pay small{display:block;color:var(--muted)}
button{width:100%;padding:14px;border:0;border-radius:8px;background:var(--accent);color:#fff;font:600 16px system-ui;cursor:pointer;margin-top:14px}
.ghost{background:none;color:var(--accent);border:1px solid var(--accent);padding:8px;font-size:14px;margin:0 0 12px}
.err{background:#f8e4e2;color:var(--bad);padding:12px 14px;border-radius:8px;margin-bottom:16px}
.muted{color:var(--muted);font-size:13px}.links{padding-left:18px;margin:6px 0 0}.links li{margin:4px 0}
a{color:var(--accent)}
@media (max-width:820px){.grid{grid-template-columns:minmax(0,1fr)}.row .c2,.row .c3,.row .c4{grid-column:span 6}}
</style></head><body><header><div><b>Torra &amp; Cia</b><span>Loja de demonstração · pagamentos Orkestral</span></div></header><main>${inner}</main></body></html>`;

const field = (name, label, cls, v, attrs = '') => `<label class="${cls}">${label}<input id="${name}" name="${name}" value="${esc(v[name])}" ${attrs}></label>`;

function checkoutPage(config, v = {}, errors = []) {
	const qty = (id) => v[`qty_${id}`] ?? 1;
	return page('Finalizar compra · Torra & Cia', `
<h1>Finalizar compra</h1>
${errors.length ? `<div class="err" role="alert">${errors.map(esc).join('<br>')}</div>` : ''}
<form method="post" action="/comprar" id="order" novalidate>
<div class="grid"><div>
<section class="box"><h2>Seus dados</h2>
<button type="button" class="ghost" id="sample">Preencher com dados de teste</button>
<div class="row">
${field('name', 'Nome *', 'c3', v, 'autocomplete="given-name" required')}
${field('surname', 'Sobrenome *', 'c3', v, 'autocomplete="family-name" required')}
${field('document', 'CPF *', 'c2', v, 'inputmode="numeric" placeholder="000.000.000-00" required')}
${field('phone', 'Celular com DDD *', 'c2', v, 'type="tel" autocomplete="tel" placeholder="(11) 99999-9999" required')}
${field('email', 'E-mail *', 'c2', v, 'type="email" autocomplete="email" required')}
</div></section>
<section class="box"><h2>Endereço de cobrança</h2><div class="row">
${field('postal_code', 'CEP *', 'c2', v, 'inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" required')}
${field('street', 'Rua *', 'c4', v, 'autocomplete="address-line1" required')}
${field('number', 'Número *', 'c2', v, 'required')}
${field('details', 'Complemento', 'c4', v, 'autocomplete="address-line2"')}
${field('neighborhood', 'Bairro *', 'c2', v, 'required')}
${field('city', 'Cidade *', 'c2', v, 'autocomplete="address-level2" required')}
<label class="c2">Estado *<select id="state" name="state" required><option value="">Selecione</option>${UFS.map((u) => `<option${v.state === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
</div></section>
<section class="box"><h2>Pagamento</h2>
<div class="pay"><svg width="34" height="24" viewBox="0 0 34 24" aria-hidden="true"><rect width="34" height="24" rx="4" fill="#3d5a40"/><rect y="6" width="34" height="4" fill="#f4f1ec"/><rect x="5" y="15" width="10" height="3" rx="1" fill="#f4f1ec"/></svg>
<div><b>Cartão de crédito</b><small>Você digita o cartão na próxima tela, no ambiente seguro da Orkestral.</small></div></div>
</section>
</div>
<aside class="box"><h2>Seu pedido</h2>
${Object.entries(PRODUCTS).map(([id, p]) => `<div class="item"><div><b>${p.name}</b><span>${p.detail} · ${brl(p.price)}</span></div>
<label>Qtd<input type="number" id="qty_${id}" name="qty_${id}" min="0" max="10" value="${esc(qty(id))}" data-price="${p.price}"></label></div>`).join('')}
<div class="sum"><span>Subtotal</span><span id="subtotal"></span></div>
<div class="sum"><span>Frete</span><span>Grátis</span></div>
<div class="sum total"><span>Total</span><span id="total"></span></div>
<button type="submit">Ir para o pagamento</button>
<p class="muted">Ao continuar, você será levado ao checkout seguro para pagar com cartão de crédito.</p>
</aside></div></form>
${config.pspMockUrl ? `<section class="box"><h2>Atalhos para a demonstração</h2>
<p class="muted">Criam um pedido (1 café) com os dados de teste e abrem o checkout. Cartão de teste: 4024 0071 9769 2931, validade 12/30, CVV 123.</p>
<ul class="links">${Object.entries(SCENARIOS).map(([id, sc]) => `<li><a href="/cenario/${id}">${sc.label}</a></li>`).join('')}
<li>Mesmo pedido em duas abas: depois de "Ir para o pagamento", copie o endereço do checkout e abra em outra aba</li></ul></section>` : ''}
<script>
const f=document.getElementById('order'),fmt=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const upd=()=>{let s=0;f.querySelectorAll('[data-price]').forEach(i=>s+=i.dataset.price*(+i.value||0));document.getElementById('subtotal').textContent=fmt(s);document.getElementById('total').textContent=fmt(s)};
f.addEventListener('input',upd);upd();
document.getElementById('sample').addEventListener('click',()=>{const d=${JSON.stringify(SAMPLE)};for(const k in d){const el=document.getElementById(k);if(el)el.value=d[k]}});
</script>`);
}

const ip = (req) => req.socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1';
const html = (res, status, body) => res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' }).end(body);

export function createStoreServer(config) {
	return createServer(async (req, res) => {
	let form = {};
	try {
		if (req.method === 'POST' && req.url === '/comprar') {
			let raw = '';
			for await (const c of req) raw += c;
			form = Object.fromEntries(new URLSearchParams(raw));
			const order = readOrder(form);
			if (order.errors.length) return html(res, 422, checkoutPage(config, form, order.errors));
			const id = await createIntent(config, order, ip(req));
			res.writeHead(303, { Location: `${config.checkoutUrl}/${id}` }).end();
		} else if (config.pspMockUrl && req.url.startsWith('/cenario/')) {
			const sc = SCENARIOS[req.url.split('/')[2]];
			if (!sc) return html(res, 404, checkoutPage(config, {}, ['Cenário inexistente.']));
			await fetch(`${config.pspMockUrl}/__mode`, { method: 'POST', body: JSON.stringify({ psp: 'cielo', mode: sc.mode }) });
			console.log(`cenario: mock cielo = ${sc.mode}`);
			const id = await createIntent(config, readOrder({ ...SAMPLE, qty_cafe: 1, qty_caneca: 0, qty_coador: 0 }), ip(req));
			res.writeHead(303, { Location: `${config.checkoutUrl}/${id}` }).end();
		} else if (req.url === '/obrigado') {
			html(res, 200, page('Pedido recebido · Torra & Cia', '<h1>Obrigado!</h1><p>Recebemos seu pedido.</p><a href="/">Voltar à loja</a>'));
		} else {
			html(res, 200, checkoutPage(config));
		}
	} catch (e) {
		console.error(e.message);
		html(res, 502, checkoutPage(config, form, [`Não foi possível iniciar o pagamento: ${e.message}`]));
	}
	});
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
	const config = readConfig();
	createStoreServer(config).listen(config.port, () => console.log(`demo store on :${config.port}`));
}
