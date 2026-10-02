FROM node:20-alpine

WORKDIR /app

# Khai báo biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=9090
ENV HOST=0.0.0.0

# Copy mã nguồn
COPY . .

# Mở cổng 9090
EXPOSE 9090

# Chạy ứng dụng
CMD ["node", "server.js"]
