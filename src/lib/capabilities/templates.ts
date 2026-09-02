export const CAPABILITY_TEMPLATES: Record<string, Record<string, string>> = {
  'sql-postgres': {
    'java': `
// Spring Boot / JPA Configuration for {{displayName}}
@Configuration
public class {{id}}Config {
    @Bean
    public DataSource dataSource() {
        return DataSourceBuilder.create()
            .url("jdbc:postgresql://{{host}}:{{port}}/{{database}}")
            .username("{{username}}")
            .password("{{password}}")
            .build();
    }
}`,
    'go': `
// Go Connection to {{displayName}}
import (
    "database/sql"
    _ "github.com/lib/pq"
)

func Connect{{id}}() (*sql.DB, error) {
    connStr := "postgres://{{username}}:{{password}}@{{host}}:{{port}}/{{database}}?sslmode=disable"
    return sql.Open("postgres", connStr)
}`,
    'python': `
# Python (FastAPI/SQLAlchemy) Connection to {{displayName}}
from sqlalchemy import create_url
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://{{username}}:{{password}}@{{host}}:{{port}}/{{database}}"
engine = create_async_engine(DATABASE_URL)`
  },
  'nosql-mongo': {
    'java': `
// Spring Boot MongoDB Configuration for {{displayName}}
@Configuration
public class {{id}}Config extends AbstractMongoClientConfiguration {
    @Override
    protected String getDatabaseName() {
        return "{{database}}";
    }

    @Override
    public MongoClient mongoClient() {
        return MongoClients.create("mongodb://{{username}}:{{password}}@{{host}}:{{port}}");
    }
}`,
    'go': `
// Go MongoDB Connection
import "go.mongodb.org/mongo-driver/mongo"

func Client() (*mongo.Client, error) {
    return mongo.Connect(ctx, options.Client().ApplyURI("mongodb://{{host}}:{{port}}"))
}`
  },
  'messaging-kafka': {
    'java': `
// Kafka Producer Config for {{displayName}}
@Configuration
public class KafkaConfig {
    @Bean
    public ProducerFactory<String, String> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "{{host}}:{{port}}");
        return new DefaultKafkaProducerFactory<>(config);
    }
}`
  }
};
