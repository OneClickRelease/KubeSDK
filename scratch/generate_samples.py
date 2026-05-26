import os
import json
import yaml

# Path to the workspace
WORKSPACE = "/Users/karansl/code/KubeSDK"
CAPABILITIES_DIR = os.path.join(WORKSPACE, "import", "supports", "capabilities")
JSON_PATH = os.path.join(WORKSPACE, "scratch", "samples_list.json")

def load_samples():
    with open(JSON_PATH, "r") as f:
        return json.load(f)

def get_dependency_snippet(provider, lang, framework, build_tool):
    p_lower = provider.lower()
    f_lower = framework.lower()
    bt_lower = build_tool.lower()
    
    # Defaults
    if lang == "java":
        if bt_lower == "maven":
            if "postgres" in p_lower:
                return """<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>"""
            elif "mysql" in p_lower:
                return """<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>"""
            elif "kafka" in p_lower:
                return """<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>"""
            elif "rabbitmq" in p_lower:
                return """<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>"""
            elif "vault" in p_lower:
                return """<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>"""
            else:
                return f"""<dependency>
    <groupId>org.example</groupId>
    <artifactId>{p_lower}-client</artifactId>
    <version>1.0.0</version>
</dependency>"""
        elif bt_lower == "gradle":
            if "postgres" in p_lower:
                return "runtimeOnly 'org.postgresql:postgresql'\nimplementation 'org.springframework.boot:spring-boot-starter-data-jpa'"
            elif "mysql" in p_lower:
                return "runtimeOnly 'com.mysql:mysql-connector-j'\nimplementation 'org.springframework.boot:spring-boot-starter-data-jpa'"
            elif "kafka" in p_lower:
                return "implementation 'org.springframework.kafka:spring-kafka'"
            elif "rabbitmq" in p_lower:
                return "implementation 'org.springframework.boot:spring-boot-starter-amqp'"
            elif "vault" in p_lower:
                return "implementation 'org.springframework.cloud:spring-cloud-starter-vault-config'"
            else:
                return f"implementation 'org.example:{p_lower}-client:1.0.0'"
        else:
            return f"<!-- Ant dependency for {provider} -->\n<ivy:dependency org=\"org.example\" name=\"{p_lower}-client\" rev=\"1.0.0\"/>"
            
    elif lang == "python":
        if "postgres" in p_lower:
            dep = "psycopg2-binary>=2.9.0"
        elif "mysql" in p_lower:
            dep = "mysqlclient>=2.2.0"
        elif "mongodb" in p_lower:
            dep = "pymongo>=4.0.0"
        elif "redis" in p_lower:
            dep = "redis>=5.0.0"
        elif "kafka" in p_lower:
            dep = "confluent-kafka>=2.0.0"
        elif "rabbitmq" in p_lower:
            dep = "pika>=1.3.0"
        elif "s3" in p_lower:
            dep = "boto3>=1.30.0"
        elif "vault" in p_lower:
            dep = "hvac>=1.1.0"
        elif "tensorflow" in p_lower:
            dep = "tensorflow>=2.15.0"
        elif "pytorch" in p_lower:
            dep = "torch>=2.1.0"
        else:
            dep = f"{p_lower}-client>=1.0.0"
            
        if bt_lower == "poetry":
            return f"[tool.poetry.dependencies]\npython = \"^3.9\"\n{dep.replace('>=', ' = \"^')}\""
        else:
            return dep

    elif lang == "go":
        if "postgres" in p_lower:
            return "github.com/lib/pq v1.10.9"
        elif "mysql" in p_lower:
            return "github.com/go-sql-driver/mysql v1.7.1"
        elif "mongodb" in p_lower:
            return "go.mongodb.org/mongo-driver v1.13.0"
        elif "nats" in p_lower:
            return "github.com/nats-io/nats.go v1.31.0"
        elif "minio" in p_lower:
            return "github.com/minio/minio-go/v7 v7.0.66"
        elif "opa" in p_lower:
            return "github.com/open-policy-agent/opa v0.59.0"
        else:
            return f"github.com/example/{p_lower}-client-go v1.0.0"

    elif lang == "nodejs":
        if "postgres" in p_lower:
            dep = "pg"
        elif "mysql" in p_lower:
            dep = "mysql2"
        elif "mongodb" in p_lower:
            dep = "mongodb"
        elif "kafka" in p_lower:
            dep = "kafkajs"
        elif "rabbitmq" in p_lower:
            dep = "amqplib"
        elif "okta" in p_lower:
            dep = "@okta/okta-sdk-nodejs"
        else:
            dep = f"{p_lower}-sdk"
            
        if bt_lower in ["npm", "yarn", "pnpm"]:
            return f'"dependencies": {{\n  "{dep}": "^1.0.0"\n}}'
        return dep

    elif lang == "cpp":
        return f"# CMake / Bazel build dependency for {provider}\nfind_package({provider} REQUIRED)"

    # Fallback
    return f"# Default dependency for {provider} in {lang}/{framework} using {build_tool}"

def get_env_vars(provider):
    p_lower = provider.lower()
    
    # Databases
    if any(db in p_lower for db in ["postgres", "mysql", "oracle", "mariadb", "sql"]):
        return [
            {"key": "DB_HOST", "value": "{{host}}"},
            {"key": "DB_PORT", "value": "{{port}}"},
            {"key": "DB_NAME", "value": "{{database}}"},
            {"key": "DB_USER", "value": "{{username}}"},
            {"key": "DB_PASS", "value": "{{password}}"}
        ]
    # Messaging
    elif any(msg in p_lower for msg in ["kafka", "pulsar", "nats", "rabbitmq"]):
        return [
            {"key": "BROKER_HOST", "value": "{{host}}"},
            {"key": "BROKER_PORT", "value": "{{port}}"},
            {"key": "BROKER_USER", "value": "{{username}}"},
            {"key": "BROKER_PASS", "value": "{{password}}"}
        ]
    # Storage / Cloud
    elif "s3" in p_lower or "minio" in p_lower or "azure" in p_lower or "efs" in p_lower or "ebs" in p_lower:
        return [
            {"key": "STORAGE_ENDPOINT", "value": "http://{{host}}:{{port}}"},
            {"key": "STORAGE_BUCKET", "value": "{{database}}"},
            {"key": "ACCESS_KEY_ID", "value": "{{username}}"},
            {"key": "SECRET_ACCESS_KEY", "value": "{{password}}"}
        ]
    # Security
    elif "vault" in p_lower or "secrets" in p_lower:
        return [
            {"key": "VAULT_ADDR", "value": "http://{{host}}:{{port}}"},
            {"key": "VAULT_TOKEN", "value": "{{password}}"}
        ]
    # Default fallback
    return [
        {"key": "SERVICE_HOST", "value": "{{host}}"},
        {"key": "SERVICE_PORT", "value": "{{port}}"},
        {"key": "SERVICE_USER", "value": "{{username}}"},
        {"key": "SERVICE_KEY", "value": "{{password}}"}
    ]

def get_config_template(provider, lang, framework):
    p_lower = provider.lower()
    f_lower = framework.lower()
    
    # Check Java Spring Boot database configuration
    if lang == "java" and "spring" in f_lower:
        if "postgres" in p_lower:
            return """# Spring Boot application.yaml for PostgreSQL
spring:
  datasource:
    url: jdbc:postgresql://{{host}}:{{port}}/{{database}}
    username: {{username}}
    password: {{password}}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect"""
        elif "mysql" in p_lower:
            return """# Spring Boot application.yaml for MySQL
spring:
  datasource:
    url: jdbc:mysql://{{host}}:{{port}}/{{database}}?useSSL=false&serverTimezone=UTC
    username: {{username}}
    password: {{password}}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect"""
        elif "oracle" in p_lower:
            return """# Spring Boot application.yaml for Oracle Database
spring:
  datasource:
    url: jdbc:oracle:thin:@{{host}}:{{port}}:{{database}}
    username: {{username}}
    password: {{password}}
    driver-class-name: oracle.jdbc.OracleDriver"""
        elif "kafka" in p_lower:
            return """# Spring Boot application.yaml for Apache Kafka
spring:
  kafka:
    bootstrap-servers: {{host}}:{{port}}
    consumer:
      group-id: my-group
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.StringDeserializer
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.StringSerializer"""
        elif "rabbitmq" in p_lower:
            return """# Spring Boot application.yaml for RabbitMQ
spring:
  rabbitmq:
    host: {{host}}
    port: {{port}}
    username: {{username}}
    password: {{password}}"""
        elif "vault" in p_lower:
            return """# Spring Boot application.yaml for HashiCorp Vault
spring:
  cloud:
    vault:
      host: {{host}}
      port: {{port}}
      scheme: http
      authentication: TOKEN
      token: {{password}}"""
      
    # Python templates
    if lang == "python":
        if "postgres" in p_lower:
            return """# Python connection configuration for PostgreSQL
import psycopg2

connection = psycopg2.connect(
    host="{{host}}",
    port={{port}},
    database="{{database}}",
    user="{{username}}",
    password="{{password}}"
)"""
        elif "mysql" in p_lower:
            return """# Python connection configuration for MySQL
import MySQLdb

db = MySQLdb.connect(
    host="{{host}}",
    port={{port}},
    db="{{database}}",
    user="{{username}}",
    passwd="{{password}}"
)"""
        elif "kafka" in p_lower:
            return """# Python confluent-kafka producer setup
from confluent_kafka import Producer

producer = Producer({
    'bootstrap.servers': '{{host}}:{{port}}',
    'security.protocol': 'plaintext'
})"""
        elif "s3" in p_lower or "minio" in p_lower:
            return """# Python boto3 S3 client connection
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://{{host}}:{{port}}',
    aws_access_key_id='{{username}}',
    aws_secret_access_key='{{password}}'
)"""

    # Go templates
    if lang == "go":
        if "postgres" in p_lower:
            return """// Go database connection configuration for PostgreSQL
package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
)

func connect() (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		"{{host}}", {{port}}, "{{username}}", "{{password}}", "{{database}}")
	return sql.Open("postgres", connStr)
}"""
        elif "minio" in p_lower:
            return """// Go MinIO client connection configuration
package main

import (
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func initMinio() (*minio.Client, error) {
	return minio.New("{{host}}:{{port}}", &minio.Options{
		Creds:  credentials.NewStaticV4("{{username}}", "{{password}}", ""),
		Secure: false,
	})
}"""

    # Fallback config mustache
    return f"""# Connection configuration template for {provider} ({lang}/{framework})
# Host: {{{{host}}}}
# Port: {{{{port}}}}
# User: {{{{username}}}}
# Password: {{{{password}}}}
# Database/Bucket: {{{{database}}}}"""

def main():
    samples = load_samples()
    print(f"Loaded {len(samples)} samples to generate.")
    
    generated_count = 0
    for idx, item in enumerate(samples):
        # Resolve target paths relative to CAPABILITIES_DIR
        sample_rel = item["sample_code"]
        config_rel = item["config_template"]
        
        sample_path = os.path.join(CAPABILITIES_DIR, sample_rel)
        config_path = os.path.join(CAPABILITIES_DIR, config_rel)
        
        # Ensure directories exist
        os.makedirs(os.path.dirname(sample_path), exist_ok=True)
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # Prepare sample.yaml structure
        lang = item["lang"]
        provider = item["provider"]
        frameworks = item["frameworks"]
        
        # Map out dependencies for frameworks & build-tools
        # Since build tools depend on the language, let's load language info from languages.yaml mapping
        # But we can just use the build tool list or generate for each combination
        # For sample.yaml, we will structure:
        # dependencies:
        #   framework:
        #     build_tool: dependency_string
        
        # In languages.yaml:
        # Java has maven, gradle, ant
        # Python has pip, poetry, setuptools
        # Go has go-build, go-mod
        # Nodejs has npm, yarn, pnpm
        # Cpp has cmake, bazel, make
        
        build_tools_map = {
            "java": ["maven", "gradle", "ant"],
            "python": ["pip", "poetry", "setuptools"],
            "go": ["go-build", "go-mod"],
            "nodejs": ["npm", "yarn", "pnpm"],
            "rust": ["cargo"],
            "cpp": ["cmake", "bazel", "make"],
            "php": ["composer"],
            "ruby": ["bundler", "rake"],
            "scala": ["sbt", "maven"],
            "kotlin": ["gradle", "maven"],
            "elixir": ["mix"],
            "erlang": ["rebar3"],
            "dart": ["pub"],
            "haskell": ["stack", "cabal"],
            "swift": ["swiftpm"],
            "r": ["r-cmd-build"],
            "perl": ["cpanm"]
        }
        
        bt_list = build_tools_map.get(lang, ["default"])
        
        dep_dict = {}
        for fw in frameworks:
            dep_dict[fw] = {}
            for bt in bt_list:
                dep_dict[fw][bt] = get_dependency_snippet(provider, lang, fw, bt)
                
        # If frameworks is empty, use 'none'
        if not frameworks:
            dep_dict["none"] = {}
            for bt in bt_list:
                dep_dict["none"][bt] = get_dependency_snippet(provider, lang, "none", bt)
                
        env_vars = get_env_vars(provider)
        
        sample_yaml_data = {
            "dependencies": dep_dict,
            "envVars": env_vars
        }
        
        # Write sample.yaml
        with open(sample_path, "w") as sf:
            yaml.dump(sample_yaml_data, sf, default_flow_style=False, sort_keys=False)
            
        # Write config.mustache
        # Choose the first framework if available for custom templates, otherwise generic
        fw_to_use = frameworks[0] if frameworks else "generic"
        config_content = get_config_template(provider, lang, fw_to_use)
        
        with open(config_path, "w") as cf:
            cf.write(config_content)
            
        generated_count += 1
        
    print(f"Successfully generated {generated_count} sets of sample.yaml and config.mustache files.")

if __name__ == "__main__":
    main()
