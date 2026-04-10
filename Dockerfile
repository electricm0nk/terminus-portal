FROM nginx:1.27-alpine

# Remove default nginx config and content
RUN rm -rf /usr/share/nginx/html/*

# Copy static site
COPY index.html /usr/share/nginx/html/index.html

# Use a minimal nginx config — no server_tokens, no directory listing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
