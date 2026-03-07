---
name: api-design
description: When to use this skill for API design including REST best practices, GraphQL patterns, OpenAPI spec generation, and versioning strategies
disable-model-invocation: false
user-invokable: true
allowed-tools: Read, Grep, Glob, Write, Bash
context: fork
agent: Integration Expert
metadata:
  keywords: [api, rest, graphql, endpoint, design]
---

# API Design Skill

## Overview
Comprehensive API design skill for REST best practices, GraphQL patterns, OpenAPI spec generation, and versioning strategies with modern API development patterns.

## Features
- REST API design and best practices
- GraphQL schema design and optimization
- OpenAPI specification generation
- API versioning strategies
- API documentation automation
- API testing strategies

## Usage Examples

### Design REST API
```bash
/api-design create --type rest --name user-service --output api.yaml
```

### Generate GraphQL Schema
```bash
/api-design graphql --schema user.graphql --mutations mutations.json
```

### Create OpenAPI Spec
```bash
/api-design openapi --version 3.0 --format json --spec spec.json
```

## Implementation

### REST API Designer
```python
class RESTAPIDesigner:
    """Designs RESTful APIs following best practices"""

    def create_resource(self, name, endpoints, methods=['GET', 'POST', 'PUT', 'DELETE']):
        """Create API resource with endpoints"""
        resource = {
            'name': name,
            'endpoints': [],
            'methods': methods,
            'description': self._generate_description(name)
        }

        for endpoint in endpoints:
            resource['endpoints'].append({
                'path': f"/{name}/{endpoint}",
                'method': methods,
                'parameters': self._generate_parameters(endpoint),
                'responses': self._generate_responses(endpoint)
            })

        return resource

    def validate_rest_compliance(self, api_spec):
        """Validate REST API compliance"""
        checks = {
            'nouns_not_verbs': self._check_nouns_not_verbs(api_spec),
            'http_methods': self._check_http_methods(api_spec),
            'status_codes': self._check_status_codes(api_spec),
            'versioning': self._check_versioning(api_spec)
        }
        return checks

    def generate_hateoas_links(self, resource):
        """Generate HATEOAS links for REST API"""
        return {
            'self': f"/{resource['name']}",
            'collection': f"/{resource['name']}s",
            'related': self._find_related_resources(resource)
        }
```

### GraphQL Designer
```python
class GraphQLDesigner:
    """Designs GraphQL schemas and resolvers"""

    def create_schema(self, types, queries, mutations):
        """Create GraphQL schema"""
        schema = {
            'types': {},
            'queries': {},
            'mutations': {},
            'subscriptions': {}
        }

        # Add types
        for type_name, type_def in types.items():
            schema['types'][type_name] = type_def

        # Add queries
        for query_name, query_def in queries.items():
            schema['queries'][query_name] = {
                'type': query_def['type'],
                'args': query_def.get('args', {}),
                'resolve': query_def.get('resolve')
            }

        # Add mutations
        for mutation_name, mutation_def in mutations.items():
            schema['mutations'][mutation_name] = {
                'type': mutation_def['type'],
                'args': mutation_def.get('args', {}),
                'resolve': mutation_def.get('resolve')
            }

        return schema

    def optimize_schema(self, schema):
        """Optimize GraphQL schema for performance"""
        # Query complexity analysis
        # Schema size optimization
        # Field suggestion optimization
        return schema

    def generate_resolvers(self, schema):
        """Generate GraphQL resolvers"""
        resolvers = {}

        for query_name, query_def in schema['queries'].items():
            resolvers[f'Query.{query_name}'] = query_def['resolve']

        for mutation_name, mutation_def in schema['mutations'].items():
            resolvers[f'Mutation.{mutation_name}'] = mutation_def['resolve']

        return resolvers
```

### OpenAPI Generator
```python
class OpenAPIGenerator:
    """Generates OpenAPI specifications"""

    def __init__(self, version='3.0.0'):
        self.version = version
        self.spec = {
            'openapi': version,
            'info': self._get_info(),
            'servers': [],
            'paths': {},
            'components': {
                'schemas': {},
                'parameters': {},
                'responses': {},
                'examples': {}
            }
        }

    def add_path(self, path, method, operation):
        """Add path to OpenAPI spec"""
        if path not in self.spec['paths']:
            self.spec['paths'][path] = {}

        self.spec['paths'][path][method.lower()] = operation

    def add_schema(self, name, schema):
        """Add schema to OpenAPI spec"""
        self.spec['components']['schemas'][name] = schema

    def generate_spec(self):
        """Generate complete OpenAPI specification"""
        return self.spec

    def validate_spec(self):
        """Validate OpenAPI specification"""
        # OpenAPI spec validation
        # Schema validation
        # Reference validation
        return True
```

## REST Best Practices

### URL Design
```python
class URLDesigner:
    """Designs REST URLs following best practices"""

    def create_resource_urls(self, resource):
        """Create proper resource URLs"""
        return {
            'collection': f"/{resource}s",
            'individual': f"/{resource}s/{{id}}",
            'nested': f"/{resource}s/{{id}}/{resource.subresource}"
        }

    def follow_hyphen_convention(self, resource_name):
        """Use hyphens for multi-word resources"""
        return resource_name.lower().replace('_', '-')

    def use_nested_resources(self, parent_resource, child_resource):
        """Create nested resource URLs"""
        return f"/{parent_resource}/{{id}}/{child_resource}"
```

### HTTP Methods Usage
```python
class HTTPMethodHandler:
    """Handles HTTP method best practices"""

    METHODS = {
        'GET': 'Retrieve data',
        'POST': 'Create new resource',
        'PUT': 'Update/replace entire resource',
        'PATCH': 'Partial update',
        'DELETE': 'Delete resource'
    }

    def validate_method_usage(self, method, resource_operation):
        """Validate HTTP method usage"""
        method_guidelines = {
            'GET': ['read', 'list', 'get'],
            'POST': ['create', 'add', 'submit'],
            'PUT': ['update', 'replace', 'modify'],
            'PATCH': ['partial', 'edit', 'modify'],
            'DELETE': ['delete', 'remove', 'destroy']
        }

        return any(
            keyword in resource_operation.lower()
            for keyword in method_guidelines.get(method, [])
        )
```

### Status Codes
```python
class StatusCodes:
    """HTTP status codes usage"""

    SUCCESS = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        202: 'Accepted',
        206: 'Partial Content'
    }

    CLIENT_ERROR = {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        422: 'Unprocessable Entity'
    }

    SERVER_ERROR = {
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable'
    }
```

## GraphQL Patterns

### Schema Design Patterns
```python
class GraphQLPatterns:
    """Common GraphQL schema patterns"""

    def pagination_pattern(self, node_type):
        """Create paginated connection pattern"""
        return {
            f'{node_type}Connection': {
                'type': 'Connection',
                'fields': {
                    'edges': {'type': f'{node_type}Edge'},
                    'pageInfo': {'type': 'PageInfo'}
                }
            },
            f'{node_type}Edge': {
                'type': 'Edge',
                'fields': {
                    'node': {'type': node_type},
                    'cursor': {'type': 'String'}
                }
            }
        }

    def mutation_pattern(self, input_type, output_type):
        """Create mutation pattern"""
        return {
            'args': {'type': input_type},
            'type': output_type,
            'resolve': lambda obj, info, **args: self._resolve_mutation(args)
        }

    def subscription_pattern(self, event_type):
        """Create subscription pattern"""
        return {
            'subscribe': lambda obj, info, **args: self._subscribe(event_type),
            'resolve': lambda payload, info: payload
        }
```

### Query Optimization
```python
class QueryOptimizer:
    """Optimizes GraphQL queries"""

    def avoid_n_plus_one(self, schema):
        """Prevent N+1 queries"""
        return {
            'resolver_middleware': [
                self._batch_queries,
                self._cache_results,
                self._defer_non_critical_fields
            ]
        }

    def query_complexity_analysis(self, query):
        """Analyze query complexity"""
        complexity = self._calculate_complexity(query)
        return {
            'complexity_score': complexity,
            'max_allowed': 100,
            'recommendations': self._get_recommendations(complexity)
        }
```

## OpenAPI Specification

### Basic Structure
```yaml
openapi: 3.0.0
info:
  title: User Service API
  description: API for managing users
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com

servers:
  - url: https://api.example.com/v1
    description: Production server

paths:
  /users:
    get:
      summary: List users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

### Components Definition
```yaml
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
```

## Versioning Strategies

### URL Versioning
```python
class URLVersioning:
    """URL-based versioning strategy"""

    def create_versioned_path(self, base_path, version):
        """Create versioned API path"""
        return f"{base_path}/v{version}"

    def maintain_backwards_compatibility(self, old_version, new_version):
        """Maintain backwards compatibility"""
        compatibility_matrix = {
            '1.0': ['1.0', '1.1'],
            '1.1': ['1.1', '1.2'],
            '2.0': ['2.0']
        }
        return new_version in compatibility_matrix.get(old_version, [])
```

### Header Versioning
```python
class HeaderVersioning:
    """Header-based versioning strategy"""

    def version_from_header(self, request):
        """Extract version from request header"""
        return request.headers.get('API-Version', '1.0')

    def supported_versions(self):
        """List supported API versions"""
        return ['1.0', '1.1', '2.0']
```

### Content Negotiation
```python
class ContentNegotiation:
    """Content negotiation for APIs"""

    def negotiate_content_type(self, accept_header):
        """Negotiate content type"""
        supported_types = ['application/json', 'application/xml']

        for content_type in accept_header.split(','):
            content_type = content_type.strip().split(';')[0]
            if content_type in supported_types:
                return content_type

        return 'application/json'
```

## API Testing

### REST Testing
```python
class RESTTester:
    """Tests REST APIs"""

    def test_endpoint(self, method, url, data=None):
        """Test API endpoint"""
        response = requests.request(
            method=method,
            url=url,
            json=data,
            headers={'Content-Type': 'application/json'}
        )

        return {
            'status_code': response.status_code,
            'response': response.json(),
            'validation': self._validate_response(response)
        }

    def test_authentication(self, endpoint, credentials):
        """Test API authentication"""
        # Authentication testing logic
        pass
```

### GraphQL Testing
```python
class GraphQLTester:
    """Tests GraphQL APIs"""

    def test_query(self, query, variables=None):
        """Test GraphQL query"""
        response = requests.post(
            'https://api.example.com/graphql',
            json={'query': query, 'variables': variables}
        )

        return {
            'data': response.json().get('data'),
            'errors': response.json().get('errors'),
            'extensions': response.json().get('extensions')
        }

    def test_mutation(self, mutation, variables):
        """Test GraphQL mutation"""
        return self.test_query(mutation, variables)
```

## Configuration

### .api-design.yml
```yaml
api:
  type: "rest"  # rest or graphql
  version: "1.0"
  base_url: "https://api.example.com"

rest:
  conventions:
    use_hyphens: true
    plural_resources: true
    hateoas: true

graphql:
  schema:
    auto_generate: true
    max_complexity: 100
    batch_queries: true

openapi:
  version: "3.0.0"
  format: "json"
  include_examples: true
  security_schemes:
    - bearerAuth:
        type: http
        scheme: bearer

versioning:
  strategy: "url"  # url, header, or content
  current_version: "1.0"
  supported_versions: ["1.0", "1.1", "2.0"]
  deprecation_policy: "6_months"
```

## Command Line Interface

### Options
- `--type`: API type (rest, graphql)
- `--version`: API version
- `--output`: Output file path
- `--format`: Output format (json, yaml, yml)
- `--validate`: Validate API specification

### Commands
- `api-design create`: Create new API specification
- `api-design generate`: Generate code from spec
- `api-design validate`: Validate API specification
- `api-design test`: Test API endpoints
- `api-design document`: Generate documentation

### Examples
```bash
# Create REST API
/api-design create --type rest --name user-service --output api.yaml

# Generate GraphQL schema
/api-design graphql --schema user.graphql --output schema.json

# Create OpenAPI spec
/api-design openapi --version 3.0 --format json --spec spec.json

# Validate API
/api-design validate --file api.yaml

# Test API endpoints
/api-design test --url https://api.example.com --endpoints users,products
```

## Troubleshooting

### Common Issues
- **Schema validation errors**: Check OpenAPI syntax
- **GraphQL performance**: Implement query batching
- **REST over-fetching**: Use proper field selection
- **Version conflicts**: Implement versioning strategy

### Error Messages
- `Invalid OpenAPI spec`: Check YAML/JSON syntax
- **GraphQL validation failed**: Review schema definitions
- **REST endpoint not found**: Check URL structure
- **Authentication failed**: Verify credentials

### Best Practices
1. **Document comprehensively**
2. **Version from day one**
3. **Use consistent naming conventions**
4. **Implement proper error handling**
5. **Test thoroughly**