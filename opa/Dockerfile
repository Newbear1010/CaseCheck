FROM openpolicyagent/opa:latest

WORKDIR /app

COPY policy/policies /policies

EXPOSE 8181

CMD ["run", "--server", "--addr", "0.0.0.0:8181", "/policies"]
