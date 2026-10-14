FROM nginx:alpine

# Копіюємо скомпільовану статику
COPY dist /usr/share/nginx/html

# Копіюємо конфігурацію для Nginx
COPY nginx-docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

