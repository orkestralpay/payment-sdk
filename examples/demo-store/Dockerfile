# Demo store (sandbox/presentations). Configuration by environment variables: see README.md.
FROM node:20.19-alpine
ENV NODE_ENV=production PORT=4030
WORKDIR /app
COPY server.mjs ./
USER node
EXPOSE 4030
CMD ["node", "server.mjs"]
