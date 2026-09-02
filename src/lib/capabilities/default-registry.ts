export interface CapabilityType {
  id: string;
  name: string;
  category: 'database' | 'messaging' | 'api' | 'cache' | 'other';
  description: string;
  icon: string;
  defaultPort?: number;
}

export const DEFAULT_CAPABILITY_TYPES: CapabilityType[] = [
  {
    id: 'sql-postgres',
    name: 'PostgreSQL',
    category: 'database',
    description: 'Relational Database Service (SQL)',
    icon: 'database',
    defaultPort: 5432
  },
  {
    id: 'sql-mysql',
    name: 'MySQL',
    category: 'database',
    description: 'Relational Database Service (SQL)',
    icon: 'database',
    defaultPort: 3306
  },
  {
    id: 'nosql-mongo',
    name: 'MongoDB',
    category: 'database',
    description: 'Document Database (NoSQL)',
    icon: 'database',
    defaultPort: 27017
  },
  {
    id: 'messaging-kafka',
    name: 'Kafka',
    category: 'messaging',
    description: 'Distributed Event Streaming',
    icon: 'message-square',
    defaultPort: 9092
  },
  {
    id: 'messaging-rabbitmq',
    name: 'RabbitMQ',
    category: 'messaging',
    description: 'Message Broker',
    icon: 'message-square',
    defaultPort: 5672
  },
  {
    id: 'cache-redis',
    name: 'Redis',
    category: 'cache',
    description: 'In-memory Data Store',
    icon: 'zap',
    defaultPort: 6379
  },
  {
    id: 'api-rest',
    name: 'REST API',
    category: 'api',
    description: 'Internal RESTful Service',
    icon: 'globe',
    defaultPort: 80
  },
  {
    id: 'api-grpc',
    name: 'gRPC Service',
    category: 'api',
    description: 'High-performance RPC',
    icon: 'globe',
    defaultPort: 50051
  }
];

export const getSuggestedType = (serviceName: string): string | null => {
  const lower = serviceName.toLowerCase();
  if (lower.includes('postgres') || lower.includes('pg-')) return 'sql-postgres';
  if (lower.includes('mysql')) return 'sql-mysql';
  if (lower.includes('mongo')) return 'nosql-mongo';
  if (lower.includes('kafka')) return 'messaging-kafka';
  if (lower.includes('redis')) return 'cache-redis';
  if (lower.includes('rabbit')) return 'messaging-rabbitmq';
  return null;
};
