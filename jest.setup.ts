import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

class ResizeObserverMock {
	observe() {}

	unobserve() {}

	disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
