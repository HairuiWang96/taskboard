# GraphQL — Senior Developer Deep Reference

**Priority: HIGH**

> Covers GraphQL fundamentals, SDL, resolvers, the N+1 problem with DataLoader fix,
> Apollo Server/Client, caching, federation, security, performance, and interview Q&A.

---

## Table of Contents

1. [GraphQL vs REST](#1-graphql-vs-rest)
2. [Schema Definition Language (SDL)](#2-schema-definition-language-sdl)
3. [Queries](#3-queries)
4. [Mutations](#4-mutations)
5. [Subscriptions](#5-subscriptions)
6. [Resolvers](#6-resolvers)
7. [Context](#7-context)
8. [The N+1 Problem](#8-the-n1-problem)
9. [DataLoader](#9-dataloader)
10. [Error Handling](#10-error-handling)
11. [Pagination](#11-pagination)
12. [Apollo Server Setup (Node.js)](#12-apollo-server-setup-nodejs)
13. [Apollo Client (React)](#13-apollo-client-react)
14. [Caching](#14-caching)
15. [Code-first vs Schema-first](#15-code-first-vs-schema-first)
16. [Schema Stitching and Federation](#16-schema-stitching-and-federation)
17. [Security](#17-security)
18. [Performance](#18-performance)
19. [Testing GraphQL APIs](#19-testing-graphql-apis)
20. [Common Interview Questions](#20-common-interview-questions)

---

## 1. GraphQL vs REST

### The problem GraphQL solves

```text
REST APIs expose multiple endpoints, each returning a fixed shape of data.
This causes two classic problems:

  OVERFETCHING — the server returns more data than the client needs.
    GET /users/42
    → { id, name, email, avatar, bio, createdAt, role, preferences, ... }
    Client only needed { id, name } but received 20 fields.
    Wastes bandwidth, especially on mobile.

  UNDERFETCHING — one endpoint doesn't return everything needed,
    so the client must make multiple sequential requests.
    GET /users/42            → get user
    GET /users/42/posts      → get their posts
    GET /posts/7/comments    → get comments on post 7
    Three round-trips for one screen.

GraphQL fixes both with a single endpoint and client-driven queries.
The client specifies exactly what it needs — nothing more, nothing less.
```

### GraphQL core model

```text
REST                        GraphQL
─────────────────────────── ──────────────────────────────────
GET /users                  POST /graphql  { query: "{ users { id name } }" }
GET /users/:id
POST /users                 POST /graphql  { query: "mutation { createUser(...) }" }
PUT /users/:id
DELETE /users/:id

Multiple endpoints           ONE endpoint  (/graphql)
Server-defined shape         Client-defined shape
Multiple round-trips         One request for any nested data
No built-in type system      Strongly typed schema (SDL)
REST verbs (GET/POST/etc)    Operations: query / mutation / subscription
```

### Concrete overfetch/underfetch comparison

```js
// REST: to render a user's profile page with their posts and each post's author
// you need 3 sequential HTTP calls:

const user    = await fetch('/users/42').then(r => r.json());
const posts   = await fetch('/users/42/posts').then(r => r.json());
const authors = await Promise.all(
  posts.map(p => fetch(`/users/${p.authorId}`).then(r => r.json()))
);
// Also: each /users response includes 15 fields you don't need.

// GraphQL: ONE request, exactly the fields you need:
const QUERY = `
  query ProfilePage($userId: ID!) {
    user(id: $userId) {
      id
      name
      posts {
        id
        title
        author {
          id
          name
        }
      }
    }
  }
`;
fetch('/graphql', {
  method: 'POST',
  body: JSON.stringify({ query: QUERY, variables: { userId: '42' } }),
  headers: { 'Content-Type': 'application/json' },
});
// Returns only the requested fields, in one round-trip.
```

### When REST is still the right choice

```text
- Simple CRUD with a small, stable API surface
- File uploads (multipart form data — awkward in GraphQL)
- Public APIs where simplicity matters for adoption
- HTTP caching is a hard requirement (GET requests with URLs)
  GraphQL POSTs are not cached by default by CDNs/browsers

GraphQL shines for:
- Complex, deeply nested data (social graphs, e-commerce)
- Multiple clients (web, mobile) with different data needs
- Rapidly evolving frontends that need flexibility
- Aggregating multiple backend services (BFF pattern)
```

---

## 2. Schema Definition Language (SDL)

### SDL is the heart of GraphQL

```graphql
# SDL defines your API's type system.
# Every field is explicitly typed — this doubles as documentation
# and enables powerful tooling (autocomplete, validation).

# ──────────────── SCALAR TYPES ────────────────
# Built-in scalars:
#   Int      — 32-bit integer
#   Float    — double-precision float
#   String   — UTF-8 string
#   Boolean  — true/false
#   ID       — unique identifier (serialized as String)

# Custom scalars (you must provide serialization logic):
scalar Date      # e.g. ISO 8601 date string
scalar JSON      # arbitrary JSON blob
scalar Upload    # file upload (with graphql-upload)

# ──────────────── OBJECT TYPES ────────────────
type User {
  id:        ID!          # ! means NON-NULLABLE — server MUST return a value
  name:      String!
  email:     String!
  role:      Role!        # enum (see below)
  posts:     [Post!]!     # list of non-null Posts; the list itself is non-null
  createdAt: Date
}

# List nullability breakdown:
#   [Post]    — list can be null; items can be null
#   [Post!]   — list can be null; items cannot be null
#   [Post]!   — list cannot be null; items can be null
#   [Post!]!  — list cannot be null; items cannot be null ← most common

type Post {
  id:      ID!
  title:   String!
  body:    String!
  author:  User!         # relationship — resolved by a resolver function
  tags:    [String!]!
}

# ──────────────── ENUM ────────────────
enum Role {
  ADMIN
  EDITOR
  VIEWER
}

# ──────────────── INTERFACE ────────────────
# Defines a contract — any type implementing this MUST have these fields.
# Resolvers must return a __resolveType to identify the concrete type.

interface Node {
  id: ID!
}

interface SearchResult {
  id:    ID!
  title: String!
}

type Article implements SearchResult & Node {
  id:      ID!
  title:   String!
  content: String!
}

type Video implements SearchResult & Node {
  id:       ID!
  title:    String!
  duration: Int!
}

# ──────────────── UNION ────────────────
# A field can return one of several unrelated types.
# Unlike interfaces, union members share NO required fields.

union FeedItem = Post | Article | Video

# ──────────────── INPUT TYPES ────────────────
# Mutations use input types — you cannot use output types as mutation arguments.
# This keeps the schema clean and separates input/output concerns.

input CreateUserInput {
  name:  String!
  email: String!
  role:  Role   # optional — defaults handled in resolver
}

input UpdateUserInput {
  name:  String   # all optional for partial update
  email: String
  role:  Role
}

# ──────────────── ROOT TYPES ────────────────
# Every schema has three special root types:

type Query {
  user(id: ID!): User
  users(role: Role, limit: Int, offset: Int): [User!]!
  search(term: String!): [SearchResult!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type Subscription {
  userCreated: User!
  postPublished(authorId: ID): Post!
}

# ──────────────── DIRECTIVES ────────────────
# Built-in schema directives:
type Product {
  id:       ID!
  name:     String!
  price:    Float!
  discount: Float @deprecated(reason: "Use salePrice instead")
  salePrice: Float
}

# Custom directives (require server-side implementation):
directive @auth(requires: Role = ADMIN) on FIELD_DEFINITION | OBJECT

type AdminQuery {
  secretData: String! @auth(requires: ADMIN)
}
```

---

## 3. Queries

### Basic query anatomy

```graphql
# Syntax: operation-type  operation-name  (variables)
#         ↓               ↓               ↓
query     GetUser         ($id: ID!)  {
  user(id: $id) {
    id
    name
    email
    posts {
      id
      title
    }
  }
}
```

### Fields and arguments

```graphql
# Arguments can be on any field, not just root fields
query {
  users(role: ADMIN, limit: 10) {   # argument on root field
    id
    name
    posts(limit: 3) {               # argument on nested field
      id
      title
    }
  }
}
```

### Aliases

```graphql
# Aliases let you request the same field multiple times with different arguments.
# Without aliases, two `user` fields would conflict.

query TwoUsers {
  alice: user(id: "1") {
    name
    email
  }
  bob: user(id: "2") {
    name
    email
  }
}
# Response:
# { "alice": { "name": "Alice", ... }, "bob": { "name": "Bob", ... } }
```

### Fragments

```graphql
# Fragments avoid repeating field selections across queries.

fragment UserFields on User {
  id
  name
  email
  role
}

query GetUsers {
  admins:  users(role: ADMIN)  { ...UserFields }
  editors: users(role: EDITOR) { ...UserFields }
}

# Inline fragments — used with interfaces/unions to access type-specific fields
query SearchFeed {
  search(term: "graphql") {
    id
    title
    ... on Article {
      content   # only on Article
    }
    ... on Video {
      duration  # only on Video
    }
  }
}
```

### Variables

```graphql
# Variables make queries reusable and safe (no string interpolation = no injection).
# They are passed separately as a JSON object alongside the query.

query GetUser($id: ID!, $includeEmail: Boolean = true) {
  user(id: $id) {
    id
    name
    email @include(if: $includeEmail)  # directive — see below
  }
}

# Variables JSON sent with the query:
# { "id": "42", "includeEmail": false }
```

### Directives: @skip and @include

```graphql
# @include(if: Boolean) — include the field ONLY IF true
# @skip(if: Boolean)    — skip (exclude) the field IF true

query GetUser($userId: ID!, $withPosts: Boolean!, $skipEmail: Boolean!) {
  user(id: $userId) {
    id
    name
    email       @skip(if: $skipEmail)       # omit email if true
    posts       @include(if: $withPosts) {  # include posts only if true
      id
      title
    }
  }
}
```

---

## 4. Mutations

### Mutation structure

```graphql
# Mutations look like queries but use the `mutation` keyword.
# By convention mutations:
#   1. Accept an input type as their argument
#   2. Return the affected object (so the client can update its cache)

mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id          # return the new user's id and name
    name        # so Apollo Client can update the cache automatically
    email
    role
  }
}

# Variables:
# {
#   "input": {
#     "name": "Alice",
#     "email": "alice@example.com",
#     "role": "EDITOR"
#   }
# }
```

### Multiple mutations in one request

```graphql
# Mutations in a single request run SEQUENTIALLY (unlike query fields which are parallel).
# This is a GraphQL spec guarantee — important for dependent operations.

mutation TwoOps {
  createUser(input: { name: "Bob", email: "bob@example.com", role: VIEWER }) {
    id
  }
  createPost(input: { title: "Hello", authorId: "..." }) {
    id
    title
  }
}
```

### Mutation resolver (server side)

```js
// resolvers/mutation.js
const Mutation = {
  createUser: async (root, { input }, context) => {
    // context.db is injected by Apollo Server's context function
    const { name, email, role = 'VIEWER' } = input;

    // Validate (or use a validation library)
    if (!email.includes('@')) throw new Error('Invalid email');

    const user = await context.db.users.create({ name, email, role });
    return user; // returned object is resolved by the User type resolvers
  },

  updateUser: async (root, { id, input }, context) => {
    const user = await context.db.users.findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return context.db.users.update(id, input);
  },

  deleteUser: async (root, { id }, context) => {
    await context.db.users.delete(id);
    return true;
  },
};

module.exports = { Mutation };
```

---

## 5. Subscriptions

### How subscriptions work

```text
Queries and mutations use HTTP request/response.
Subscriptions use WebSockets (or SSE) for persistent, real-time connections.

Flow:
  1. Client sends a "subscribe" message over WebSocket.
  2. Server registers a listener on a pub/sub channel.
  3. When an event fires (e.g. new message), server pushes data to all subscribed clients.
  4. Client receives updates without polling.

Common pub/sub backends:
  - graphql-subscriptions (in-memory PubSub — development only, single process)
  - Redis PubSub (production — works across multiple server instances)
  - Kafka, RabbitMQ for high-volume event streams
```

### Server-side subscription setup

```js
// Using Apollo Server with graphql-ws (the modern WS library)

const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

// ── SDL ──
const typeDefs = `
  type Subscription {
    messageAdded(channelId: ID!): Message!
  }
`;

// ── Resolvers ──
const Subscription = {
  messageAdded: {
    // subscribe returns an AsyncIterator — Apollo Server calls next() on it
    // when new events arrive and sends the value to the client
    subscribe: (root, { channelId }) =>
      pubsub.asyncIterator([`MESSAGE_ADDED_${channelId}`]),

    // Optional resolve fn to transform the event payload
    resolve: (payload) => payload.messageAdded,
  },
};

// ── Publishing from a mutation ──
const Mutation = {
  sendMessage: async (root, { channelId, text }, context) => {
    const message = await context.db.messages.create({ channelId, text });

    // Notify all subscribers watching this channel
    pubsub.publish(`MESSAGE_ADDED_${channelId}`, { messageAdded: message });

    return message;
  },
};
```

### Client-side subscription (Apollo Client)

```jsx
import { useSubscription, gql } from '@apollo/client';

const MESSAGE_ADDED = gql`
  subscription OnMessageAdded($channelId: ID!) {
    messageAdded(channelId: $channelId) {
      id
      text
      author { id name }
    }
  }
`;

function ChatChannel({ channelId }) {
  const { data, loading, error } = useSubscription(MESSAGE_ADDED, {
    variables: { channelId },
  });

  if (loading) return <p>Connecting...</p>;
  if (error)   return <p>Error: {error.message}</p>;

  return <div>New message: {data.messageAdded.text}</div>;
}
```

---

## 6. Resolvers

### What resolvers are

```text
A resolver is the function that fetches the data for a single field in your schema.
Every field CAN have a resolver. If it doesn't, GraphQL uses a default resolver:
  defaultResolver = (parent, args, ctx, info) => parent[info.fieldName]
  i.e. it just reads the field from the parent object by name.

The resolver chain — how GraphQL resolves a nested query:

  query {
    user(id: "1") {     ← Query.user resolver runs first
      id                ← default resolver: parent.id
      name              ← default resolver: parent.name
      posts {           ← User.posts resolver runs with user as parent
        id              ← default resolver: parent.id
        title           ← default resolver: parent.title
        author {        ← Post.author resolver runs with post as parent
          name          ← default resolver: parent.name
        }
      }
    }
  }

Each resolver runs after its parent resolver has returned.
Child resolvers receive the parent's return value as their first argument.
```

### The four resolver arguments

```js
// Every resolver receives exactly these four arguments:

const resolver = (
  parent,   // (also called root/source) — the return value of the parent resolver
            // For root fields (Query/Mutation) this is usually undefined or {}

  args,     // an object of the arguments provided to this field in the query
            // e.g. for user(id: "42") → args = { id: "42" }

  context,  // a shared object for the ENTIRE request
            // typically contains: { user, db, loaders, req }
            // injected by Apollo Server's context function (see Section 7)

  info,     // contains schema info, field name, return type, path, etc.
            // info.fieldName — name of the current field
            // info.returnType — GraphQL type being returned
            // rarely needed except for advanced use (query analysis, logging)
) => { /* ... */ };
```

### Full resolver map example

```js
// resolvers/index.js
const { UserAPI, PostAPI } = require('../dataSources');

const resolvers = {
  // ── Root Query resolvers ──
  Query: {
    // parent is undefined for root-level resolvers
    user: async (parent, { id }, context) => {
      return context.loaders.user.load(id); // DataLoader (see Section 9)
    },

    users: async (parent, { role, limit = 20, offset = 0 }, context) => {
      return context.db.users.findAll({ where: { role }, limit, offset });
    },

    search: async (parent, { term }, context) => {
      return context.db.search(term); // returns mixed Article/Video array
    },
  },

  // ── Object type resolvers ──
  User: {
    // parent = the User object returned by Query.user
    posts: async (parent, args, context) => {
      // Without DataLoader this is the N+1 problem (see Section 8)
      return context.loaders.postsByUser.load(parent.id);
    },
    fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
  },

  Post: {
    author: async (parent, args, context) => {
      return context.loaders.user.load(parent.authorId);
    },
  },

  // ── Interface/Union resolver ──
  // GraphQL needs to know which concrete type a union/interface value is
  SearchResult: {
    __resolveType(obj) {
      if (obj.content !== undefined)  return 'Article';
      if (obj.duration !== undefined) return 'Video';
      return null; // GraphQL will throw if null
    },
  },

  // ── Custom scalar ──
  Date: {
    serialize:    (value) => new Date(value).toISOString(),
    parseValue:   (value) => new Date(value),
    parseLiteral: (ast)   => new Date(ast.value),
  },
};

module.exports = resolvers;
```

---

## 7. Context

### What context is

```text
Context is a plain object that is created ONCE per request and injected
into EVERY resolver in the resolver chain.

It is the correct place to put:
  - The authenticated user (decoded from JWT/session)
  - Database connections / ORM instances
  - DataLoader instances (MUST be per-request — see Section 9)
  - Feature flags
  - Request-level caches

DO NOT put global singletons in context — they belong at module scope.
DO NOT put per-field state in context — resolvers should be stateless.
```

### Apollo Server context function

```js
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const jwt = require('jsonwebtoken');
const { createLoaders } = require('./loaders');
const db = require('./db');

const server = new ApolloServer({ typeDefs, resolvers });
await server.start();

app.use(
  '/graphql',
  expressMiddleware(server, {
    // context is an async function called once per request
    // it receives the raw Express req/res
    context: async ({ req }) => {
      // 1. Extract and verify auth token
      const token = req.headers.authorization?.replace('Bearer ', '');
      let user = null;
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
          // token invalid — user stays null
          // resolvers that require auth can throw an AuthenticationError
        }
      }

      // 2. Return context — available in EVERY resolver as the third argument
      return {
        user,                    // { id, email, role } or null
        db,                      // Prisma/Sequelize/Mongoose instance
        loaders: createLoaders(), // NEW DataLoader instances per request
      };
    },
  })
);
```

### Using context in resolvers

```js
const resolvers = {
  Query: {
    // Public query — no auth check needed
    posts: (parent, args, context) => context.db.posts.findAll(),

    // Protected query — check context.user
    me: (parent, args, context) => {
      if (!context.user) {
        throw new GraphQLError('You must be logged in', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      return context.db.users.findById(context.user.id);
    },

    adminStats: (parent, args, context) => {
      if (context.user?.role !== 'ADMIN') {
        throw new GraphQLError('Forbidden', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return context.db.stats.getSummary();
    },
  },
};
```

---

## 8. The N+1 Problem

### What it is — the broken example

```text
The N+1 problem: to fetch a list of N items, the server makes 1 query to get
the list, then N additional queries — one per item — to fetch related data.

Result: fetching 100 users fires 101 database queries instead of 2.
This is one of the most common performance killers in GraphQL APIs.
```

```js
// Schema:
//   query { users { id name posts { id title } } }

// ── BROKEN resolver (naive — causes N+1) ──
const resolvers = {
  Query: {
    // 1 query: SELECT * FROM users  → returns [user1, user2, ..., user100]
    users: () => db.users.findAll(),
  },

  User: {
    // Called ONCE PER USER — 100 separate queries!
    //   SELECT * FROM posts WHERE author_id = 1
    //   SELECT * FROM posts WHERE author_id = 2
    //   ...
    //   SELECT * FROM posts WHERE author_id = 100
    posts: (parent) => db.posts.findAll({ where: { authorId: parent.id } }),
  },
};

// Log output for 100 users:
// Executing: SELECT * FROM users                      ← 1 query
// Executing: SELECT * FROM posts WHERE author_id = 1  ← N queries
// Executing: SELECT * FROM posts WHERE author_id = 2
// ...
// Executing: SELECT * FROM posts WHERE author_id = 100
// Total: 101 database queries  ← catastrophic for performance
```

### Why this happens

```text
GraphQL resolves fields independently, one resolver per field.
The User.posts resolver only knows about ONE user at a time (its parent).
It has no visibility into the fact that 100 users are being processed
in parallel — each resolver fires its own query immediately.

The fix: batch all those individual IDs and make ONE query instead.
That's what DataLoader does.
```

---

## 9. DataLoader

### How DataLoader works

```text
DataLoader (facebook/dataloader) solves N+1 with two mechanisms:

  BATCHING:
    Instead of executing each load() immediately, DataLoader collects
    all .load() calls made during the current tick (the event loop tick),
    then fires a SINGLE batch function with all the IDs at once.

    100 calls to:  loader.load(userId)
    Become one:    batchFn([1, 2, 3, ..., 100])
    Which runs:    SELECT * FROM users WHERE id IN (1,2,...,100)

  CACHING:
    Within a single request, if the same ID is loaded twice,
    DataLoader returns the cached result from the first load.
    This prevents duplicate queries for the same object.

  ‼️ DataLoader instances MUST be created per-request (inside the context function).
     Sharing one DataLoader across requests causes cross-request cache pollution,
     which can leak private data between users.
```

### The fix — DataLoader example

```js
// loaders.js
const DataLoader = require('dataloader');
const db = require('./db');

// batchFn receives an array of keys (all IDs collected this tick)
// MUST return a Promise resolving to an array of values
// where values[i] corresponds to keys[i] — order MUST match

const batchUsers = async (userIds) => {
  // One query instead of N
  const users = await db.users.findAll({
    where: { id: userIds },
  });

  // DataLoader requires results in the SAME ORDER as the input keys
  // Build a map first, then reorder
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });
  return userIds.map(id => userMap[id] || null);
};

const batchPostsByUser = async (authorIds) => {
  // Fetch ALL posts for all author IDs in one query
  const posts = await db.posts.findAll({
    where: { authorId: authorIds },
  });

  // Group by authorId — return an array per key
  const map = {};
  authorIds.forEach(id => { map[id] = []; });
  posts.forEach(p => { map[p.authorId].push(p); });
  return authorIds.map(id => map[id]);
};

// createLoaders is called once per request (in context function)
const createLoaders = () => ({
  user:          new DataLoader(batchUsers),
  postsByUser:   new DataLoader(batchPostsByUser),
});

module.exports = { createLoaders };
```

```js
// resolvers/index.js — FIXED with DataLoader
const resolvers = {
  Query: {
    // 1 query: SELECT * FROM users
    users: () => db.users.findAll(),
  },

  User: {
    // loader.load(parent.id) does NOT fire a query immediately.
    // DataLoader batches all 100 calls from the current tick and fires ONE query:
    //   SELECT * FROM posts WHERE author_id IN (1, 2, ..., 100)
    posts: (parent, args, context) => context.loaders.postsByUser.load(parent.id),
  },
};

// Log output for 100 users (with DataLoader):
// Executing: SELECT * FROM users                                     ← 1 query
// Executing: SELECT * FROM posts WHERE author_id IN (1,2,...,100)    ← 1 query
// Total: 2 database queries  ✓
```

### DataLoader with caching

```js
// Within one request, loading the same ID twice returns the cached value:

const user1a = await context.loaders.user.load('1'); // fires batch query
const user1b = await context.loaders.user.load('1'); // returns cached result
// user1a === user1b (same reference)

// To bypass the cache (e.g. after a mutation):
context.loaders.user.clear('1');
context.loaders.user.load('1'); // fetches fresh

// To prime the cache manually (e.g. after creating a user):
const newUser = await db.users.create(input);
context.loaders.user.prime(newUser.id, newUser); // warm the cache
```

---

## 10. Error Handling

### Partial errors — GraphQL's superpower

```text
In REST, one failure means the whole response fails (4xx/5xx).

In GraphQL, errors are PARTIAL. The response has two top-level keys:
  { "data": { ... }, "errors": [ ... ] }

If one field's resolver throws, that field is null in data, and the error
is added to the errors array. Other fields continue resolving normally.

This means the client can still render partial UI even when some data fails.
```

### Error response structure

```json
{
  "data": {
    "user": {
      "id": "42",
      "name": "Alice",
      "posts": null
    }
  },
  "errors": [
    {
      "message": "Database connection failed",
      "locations": [{ "line": 4, "column": 5 }],
      "path": ["user", "posts"],
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
        "timestamp": "2026-05-16T12:00:00Z"
      }
    }
  ]
}
```

### Custom error classes

```js
// Apollo Server re-exports GraphQLError; use extensions.code for machine-readable codes.
const { GraphQLError } = require('graphql');

// Predefined Apollo error codes (convention):
//   UNAUTHENTICATED  — user is not logged in
//   FORBIDDEN        — user lacks permission
//   BAD_USER_INPUT   — invalid input from client
//   NOT_FOUND        — resource doesn't exist
//   INTERNAL_SERVER_ERROR — unexpected server error

// Custom error with extensions
const throwNotFound = (resource, id) => {
  throw new GraphQLError(`${resource} with id ${id} not found`, {
    extensions: {
      code: 'NOT_FOUND',
      resource,
      id,
    },
  });
};

// Usage in resolver
const resolvers = {
  Query: {
    user: async (parent, { id }, context) => {
      const user = await context.db.users.findById(id);
      if (!user) throwNotFound('User', id);
      return user;
    },
  },
};

// Apollo Server 4 error formatting
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return { message: 'Internal server error', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
      }
    }
    return formattedError; // return as-is in development
  },
});
```

---

## 11. Pagination

### Offset-based pagination

```graphql
# Simple but has problems with real-time data (items shift as new ones are added)

type Query {
  users(limit: Int!, offset: Int!): [User!]!
}
```

```js
// Resolver
Query: {
  users: (parent, { limit, offset }, context) =>
    context.db.users.findAll({ limit, offset, order: [['createdAt', 'DESC']] }),
}

// Client fetches page 3 (10 items per page):
// users(limit: 10, offset: 20)
// Problem: if a new user is added between page 1 and page 2 requests,
// page 2 will show a duplicate item from the shifted list.
```

### Cursor-based pagination (Relay spec)

```text
The Relay cursor-based pagination spec is the GraphQL standard for pagination.
It eliminates the shifting-list problem by using an opaque cursor (usually a
base64-encoded ID or timestamp) as the pagination anchor.

The spec defines three concepts:
  Connection — the paginated list (e.g. UserConnection)
  Edge        — a wrapper around each item, adds the cursor
  PageInfo    — metadata about the current page (hasNextPage, etc.)
```

```graphql
# Relay-style pagination types

type UserConnection {
  edges:    [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node:   User!      # the actual item
  cursor: String!    # opaque pagination cursor for this item
}

type PageInfo {
  hasNextPage:     Boolean!
  hasPreviousPage: Boolean!
  startCursor:     String   # cursor of first item in this page
  endCursor:       String   # cursor of last item in this page
}

type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
  # first/after = forward pagination
  # last/before  = backward pagination
}
```

```js
// Cursor pagination resolver
const { encode, decode } = require('./cursor'); // base64 encode/decode helpers

const resolvers = {
  Query: {
    users: async (parent, { first = 10, after }, context) => {
      // Decode the opaque cursor back to an ID
      const afterId = after ? decode(after) : null;

      const users = await context.db.users.findAll({
        where: afterId ? { id: { $gt: afterId } } : {},
        limit: first + 1,      // fetch one extra to determine hasNextPage
        order: [['id', 'ASC']],
      });

      const hasNextPage = users.length > first;
      const items = hasNextPage ? users.slice(0, first) : users;

      return {
        edges: items.map(user => ({
          node:   user,
          cursor: encode(user.id), // opaque cursor sent to client
        })),
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: items[0]      ? encode(items[0].id)      : null,
          endCursor:   items.at(-1)  ? encode(items.at(-1).id)  : null,
        },
        totalCount: await context.db.users.count(),
      };
    },
  },
};

// Client query:
// users(first: 10, after: "Y3Vyc29yOjE=") {
//   edges { cursor node { id name } }
//   pageInfo { hasNextPage endCursor }
// }
```

---

## 12. Apollo Server Setup (Node.js)

### Full working example

```js
// server.js
const express = require('express');
const http    = require('http');
const cors    = require('cors');
const { json } = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const jwt = require('jsonwebtoken');
const db  = require('./db');
const { createLoaders } = require('./loaders');
const { typeDefs }  = require('./schema');
const { resolvers } = require('./resolvers');

async function startServer() {
  const app        = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer({
    typeDefs,
    resolvers,

    // Drain plugin: waits for in-flight requests before shutting down
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],

    // Format errors before sending to client
    formatError: (formattedError) => {
      if (process.env.NODE_ENV === 'production' &&
          formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return { message: 'Something went wrong', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
      }
      return formattedError;
    },
  });

  await server.start();

  app.use(
    '/graphql',
    cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Authenticate
        const token = req.headers.authorization?.replace('Bearer ', '');
        let user = null;
        if (token) {
          try { user = jwt.verify(token, process.env.JWT_SECRET); }
          catch {}
        }

        return {
          user,
          db,
          loaders: createLoaders(), // fresh per request — critical for DataLoader
          req,
        };
      },
    })
  );

  await new Promise(resolve => httpServer.listen({ port: 4000 }, resolve));
  console.log('GraphQL server ready at http://localhost:4000/graphql');
}

startServer();
```

### Schema file structure

```js
// schema/index.js
const { gql } = require('graphql-tag');

const typeDefs = gql`
  scalar Date

  enum Role { ADMIN EDITOR VIEWER }

  type User {
    id:        ID!
    name:      String!
    email:     String!
    role:      Role!
    posts:     [Post!]!
    createdAt: Date!
  }

  type Post {
    id:      ID!
    title:   String!
    body:    String!
    author:  User!
    tags:    [String!]!
  }

  input CreateUserInput {
    name:  String!
    email: String!
    role:  Role
  }

  type Query {
    user(id: ID!): User
    users(role: Role, limit: Int, offset: Int): [User!]!
    me: User
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    deleteUser(id: ID!): Boolean!
  }
`;

module.exports = { typeDefs };
```

---

## 13. Apollo Client (React)

### Setup

```jsx
// src/apolloClient.js
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP link for queries and mutations
const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' });

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({ url: 'ws://localhost:4000/graphql' })
);

// Route operations to the correct link based on operation type
const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,   // subscriptions → WebSocket
  httpLink, // queries/mutations → HTTP
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// src/index.jsx
import { ApolloProvider } from '@apollo/client';
import { client } from './apolloClient';

root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
```

### useQuery

```jsx
import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers($role: Role) {
    users(role: $role) {
      id
      name
      email
      role
    }
  }
`;

function UserList({ role }) {
  const { data, loading, error, refetch, fetchMore } = useQuery(GET_USERS, {
    variables: { role },
    fetchPolicy: 'cache-and-network', // use cache but also revalidate (see Section 14)
    notifyOnNetworkStatusChange: true, // re-render during refetch
  });

  if (loading) return <Spinner />;
  if (error)   return <Error message={error.message} />;

  return (
    <>
      {data.users.map(user => <UserCard key={user.id} user={user} />)}
      <button onClick={() => refetch()}>Refresh</button>
    </>
  );
}
```

### useMutation

```jsx
import { useMutation, gql } from '@apollo/client';

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      role
    }
  }
`;

const GET_USERS = gql`query GetUsers { users { id name email role } }`;

function CreateUserForm() {
  const [createUser, { loading, error }] = useMutation(CREATE_USER, {
    // Option 1: refetchQueries — re-runs specified queries after mutation
    refetchQueries: [{ query: GET_USERS }],

    // Option 2: update — manually update the cache (no extra network request)
    update(cache, { data: { createUser } }) {
      const existing = cache.readQuery({ query: GET_USERS });
      if (existing) {
        cache.writeQuery({
          query: GET_USERS,
          data: { users: [...existing.users, createUser] },
        });
      }
    },

    onCompleted: (data) => console.log('Created:', data.createUser),
    onError:     (err)  => console.error('Failed:', err.message),
  });

  const handleSubmit = (formData) => {
    createUser({ variables: { input: formData } });
  };

  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

### Optimistic UI

```jsx
// Optimistic UI: update the cache IMMEDIATELY before the server responds.
// If the server fails, Apollo rolls back the optimistic update automatically.

const [likePost] = useMutation(LIKE_POST, {
  optimisticResponse: {
    likePost: {
      __typename: 'Post',
      id: postId,
      likeCount: currentLikeCount + 1, // assume success instantly
    },
  },
  update(cache, { data: { likePost } }) {
    cache.modify({
      id: cache.identify(likePost),
      fields: {
        likeCount: () => likePost.likeCount,
      },
    });
  },
});
```

---

## 14. Caching

### Apollo Client InMemoryCache

```text
Apollo Client caches query results in a normalized in-memory store.

NORMALIZATION: instead of storing query results as nested trees,
Apollo flattens them into a table keyed by __typename + id.

Example — after running:
  query { user(id: "1") { id name posts { id title } } }

The cache stores:
  "User:1"   → { id: "1", name: "Alice", posts: [ref("Post:10"), ref("Post:11")] }
  "Post:10"  → { id: "10", title: "Hello" }
  "Post:11"  → { id: "11", title: "World" }

Now if another query returns User:1, Apollo serves it from cache WITHOUT a network request.
If Post:10 is updated by a mutation that returns Post:10 with the same id, the cache
automatically updates every query that references Post:10 — across all components.
```

### InMemoryCache configuration

```js
import { InMemoryCache } from '@apollo/client';

const cache = new InMemoryCache({
  // Tell Apollo which field is the unique ID for each type
  // Default: `id` or `_id` — customize if your schema differs
  typePolicies: {
    User: {
      keyFields: ['id'],      // default — explicit here for clarity
    },
    Product: {
      keyFields: ['sku'],     // use sku instead of id
    },
    // Types without a natural ID — store as a singleton (no normalization)
    AppConfig: {
      keyFields: [],
    },
    Query: {
      fields: {
        // Merge paginated results instead of replacing them
        users: {
          keyArgs: ['role'],   // separate cache entries per role
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
  },
});
```

### cache.writeQuery and cache.modify

```js
// cache.writeQuery — write a full query result into the cache
cache.writeQuery({
  query: GET_USER,
  variables: { id: '1' },
  data: {
    user: { __typename: 'User', id: '1', name: 'Updated Name', email: 'a@b.com' },
  },
});

// cache.modify — surgically update specific fields of a cached object
// More efficient than writeQuery for partial updates
cache.modify({
  id: cache.identify({ __typename: 'User', id: '1' }), // "User:1"
  fields: {
    name: () => 'New Name',
    // Modifier function receives the current field value:
    likeCount: (current) => current + 1,
    // Remove a field from cache:
    temporaryField: (_, { DELETE }) => DELETE,
  },
});

// cache.evict — remove an object from cache entirely
cache.evict({ id: cache.identify({ __typename: 'User', id: '1' }) });
cache.gc(); // run garbage collection after eviction
```

### Fetch policies

```text
fetchPolicy controls how Apollo balances cache vs network:

  'cache-first'        (default) — read from cache; skip network if data exists.
                                   Best for rarely-changing data.

  'cache-and-network'  — read from cache immediately, ALSO fire network request.
                         Re-renders when network response arrives.
                         Best for data that changes, where stale UI is acceptable.

  'network-only'       — always hit the network; store in cache for other queries.
                         Best for real-time/critical data.

  'no-cache'           — always hit the network; do NOT store in cache.

  'cache-only'         — read from cache only; throw if not in cache.
                         Useful for reading data you know was previously fetched.

  'standby'            — like cache-first but won't re-render on cache updates.
```

---

## 15. Code-first vs Schema-first

### Schema-first (SDL-first)

```text
You write the SDL (.graphql files) manually, then implement resolvers to match.

Pros:
  - SDL is the source of truth — clear contract between frontend and backend
  - Frontend can mock from SDL before backend is implemented
  - Excellent tooling (GraphQL Playground, code generation from SDL)
  - Schema is language-agnostic documentation

Cons:
  - SDL and resolver type signatures can drift out of sync
  - Duplication: define types in SDL AND in TypeScript interfaces

Tools: Apollo Server, graphql-tools, graphql-modules
```

```js
// Schema-first example
const { gql } = require('graphql-tag');

const typeDefs = gql`
  type User { id: ID! name: String! }
  type Query { user(id: ID!): User }
`;

const resolvers = {
  Query: { user: (_, { id }) => db.users.findById(id) },
};
```

### Code-first

```text
You write code (classes/decorators/builder functions) and the SDL is GENERATED.

Pros:
  - Single source of truth in code — no drift between types and resolvers
  - Full TypeScript type safety
  - Schema programmatically composable (mixins, conditional types)

Cons:
  - Steeper learning curve
  - SDL is generated, not hand-crafted — can be harder to read for non-coders

Tools: TypeGraphQL, Pothos (formerly GiraphQL), NestJS GraphQL module
```

```ts
// Code-first with TypeGraphQL
import { ObjectType, Field, ID, Resolver, Query, Arg } from 'type-graphql';

@ObjectType()
class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;
}

@Resolver(User)
class UserResolver {
  @Query(() => User, { nullable: true })
  async user(@Arg('id') id: string): Promise<User | null> {
    return db.users.findById(id);
  }
}

// buildSchema generates the SDL from the above decorators
const schema = await buildSchema({ resolvers: [UserResolver] });
```

---

## 16. Schema Stitching and Federation

### The problem: multiple GraphQL services

```text
As teams grow, splitting a monolithic GraphQL schema into separate services
becomes necessary. Two approaches exist:

  Schema Stitching  — gateway combines multiple schemas at the gateway level.
                      Older approach; still useful for merging 3rd party APIs.

  Apollo Federation — each service owns its slice of the schema and declares
                      which types it extends/contributes to. Gateway merges at
                      query planning time. The modern standard.
```

### Apollo Federation v2

```js
// users-service/schema.js — owns User type
const { gql } = require('graphql-tag');

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type User @key(fields: "id") {
    id:    ID!
    name:  String!
    email: String!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const resolvers = {
  User: {
    // __resolveReference is called by the gateway to resolve an entity by key
    __resolveReference: (ref, context) => context.db.users.findById(ref.id),
  },
  Query: {
    user:  (_, { id }, ctx) => ctx.db.users.findById(id),
    users: (_, __, ctx)    => ctx.db.users.findAll(),
  },
};
```

```js
// posts-service/schema.js — owns Post type, EXTENDS User
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0",
    import: ["@key", "@external", "@requires"])

  type User @key(fields: "id") {
    id:    ID!    @external      # declared in users-service — this service doesn't own it
    posts: [Post!]!              # this service ADDS posts to User
  }

  type Post {
    id:     ID!
    title:  String!
    author: User!
  }

  type Query {
    post(id: ID!): Post
  }
`;

const resolvers = {
  User: {
    // The gateway sends { __typename: 'User', id: '...' } to this service
    // This resolver fetches the posts for that user
    posts: (user, _, ctx) => ctx.db.posts.findAll({ where: { authorId: user.id } }),
  },
  Post: {
    author: (post) => ({ __typename: 'User', id: post.authorId }),
  },
};
```

```js
// gateway/index.js — Apollo Gateway combines everything
const { ApolloGateway } = require('@apollo/gateway');
const { ApolloServer }  = require('@apollo/server');

const gateway = new ApolloGateway({
  supergraphSdl: /* managed via Apollo Studio, or inline supergraph SDL */,
});

const server = new ApolloServer({ gateway });
await server.start();
```

---

## 17. Security

### Query depth limiting

```js
// Without depth limiting, an attacker can send deeply nested queries
// that are valid but cause the server to do exponential work.

// Malicious query:
// { user { posts { author { posts { author { posts { ... } } } } } } }

const { createComplexityLimitRule } = require('graphql-validation-complexity');
const depthLimit = require('graphql-depth-limit');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(7), // reject queries deeper than 7 levels
  ],
});
```

### Query complexity analysis

```js
// Assign a "cost" to each field and reject queries that exceed the budget.
// This prevents expensive queries even within the depth limit.

const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityLimitRule(1000, { // reject if total complexity > 1000
      scalarCost:      1,   // leaf fields cost 1
      objectCost:      2,   // object fields cost 2
      listFactor:      10,  // lists multiply cost by 10
    }),
  ],
});

// Alternative: graphql-cost-analysis with custom costs per field
```

### Disabling introspection in production

```js
// Introspection lets anyone query your entire schema structure.
// Disable it in production to make reconnaissance harder.

const { ApolloServerPluginLandingPageDisabled } = require('@apollo/server/plugin/disabled');
const { NoSchemaIntrospectionCustomRule } = require('graphql');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // Disable the Apollo Sandbox landing page in production
  plugins: [
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault(),
  ],
  validationRules:
    process.env.NODE_ENV === 'production'
      ? [NoSchemaIntrospectionCustomRule]
      : [],
});
```

### Rate limiting

```js
// Rate limit at the HTTP layer (before GraphQL parsing)
// using express-rate-limit or similar

const rateLimit = require('express-rate-limit');

app.use('/graphql', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per window per IP
  message: { errors: [{ message: 'Too many requests, please try again later.' }] },
}));

// For authenticated users, rate-limit by user ID in the context:
const { RateLimiterMemory } = require('rate-limiter-flexible');
const limiter = new RateLimiterMemory({ points: 50, duration: 60 });

// In context function:
context: async ({ req }) => {
  if (user) {
    await limiter.consume(user.id); // throws if limit exceeded
  }
  return { user, db, loaders: createLoaders() };
}
```

### Input validation

```js
// Validate input types in resolvers — never trust client data

const Joi = require('joi');

const createUserSchema = Joi.object({
  name:  Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  role:  Joi.string().valid('ADMIN', 'EDITOR', 'VIEWER'),
});

const Mutation = {
  createUser: async (_, { input }, context) => {
    const { error, value } = createUserSchema.validate(input);
    if (error) {
      throw new GraphQLError(error.details[0].message, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    return context.db.users.create(value);
  },
};
```

---

## 18. Performance

### Persisted Queries

```text
PROBLEM: GraphQL queries sent as strings in every request are large payloads.
For a production app with complex queries, the query string can be kilobytes.

AUTOMATIC PERSISTED QUERIES (APQ):
  Apollo Client sends a hash of the query instead of the query string.
  If the server has seen this hash before, it uses the cached query.
  If not, the server returns an error, and the client resends with the full query.
  On the next request, only the hash is needed.

  Client: POST { extensions: { persistedQuery: { sha256Hash: "abc..." } } }
  Server: "I know this hash" → executes cached query
  Server: "Unknown hash"     → client resends with full query + hash
                               server stores hash→query mapping
```

```js
// Apollo Client APQ setup
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const persistedQueriesLink = createPersistedQueryLink({ sha256 });
const httpLink = new HttpLink({ uri: '/graphql' });

const client = new ApolloClient({
  link: persistedQueriesLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Apollo Server APQ setup
const { ApolloServerPluginLandingPageLocalDefault } = require('@apollo/server/plugin/landingPage/default');
// APQ is enabled by default in Apollo Server 4 with an in-memory cache.
// For production, use a shared Redis cache:
const { KeyvAdapter } = require('@apollo/utils.keyvadapter');
const Keyv = require('keyv');
const KeyvRedis = require('@keyv/redis');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  cache: new KeyvAdapter(new Keyv({ store: new KeyvRedis('redis://localhost:6379') })),
});
```

### Query batching (Apollo Client)

```js
// Apollo Client can batch multiple queries into one HTTP request
// using BatchHttpLink — reduces round-trips when many queries fire simultaneously

import { BatchHttpLink } from '@apollo/client/link/batch-http';

const batchLink = new BatchHttpLink({
  uri: '/graphql',
  batchMax:     5,   // max operations per batch
  batchInterval: 20, // wait 20ms to collect operations before sending
});

// The server must support batching (Apollo Server does by default):
// POST /graphql  with body: [ { query: "..." }, { query: "..." } ]
// Response: [ { data: {...} }, { data: {...} } ]
```

### Caching at the field level

```js
// Apollo Server supports response caching with cache hints
// Fields can declare how long their data should be cached

const typeDefs = gql`
  type Post {
    id:    ID!
    title: String!
    body:  String!
  }

  type Query {
    # Hint: this data can be cached for 60 seconds, publicly (no auth)
    posts: [Post!]! @cacheControl(maxAge: 60, scope: PUBLIC)
    # Per-user data: cache for 30s but PRIVATE (per user)
    me: User @cacheControl(maxAge: 30, scope: PRIVATE)
  }
`;

// Requires @apollo/server-plugin-response-cache
const responseCachePlugin = require('@apollo/server-plugin-response-cache');
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [responseCachePlugin()],
  cache: new KeyvAdapter(new Keyv({ store: new KeyvRedis(process.env.REDIS_URL) })),
});
```

---

## 19. Testing GraphQL APIs

### Unit testing resolvers directly

```js
// resolvers/__tests__/user.test.js
// Test resolver logic in isolation — no HTTP, no server

const { Query, User } = require('../user');

describe('Query.user', () => {
  const mockDb = {
    users: {
      findById: jest.fn(),
    },
  };
  const mockContext = { db: mockDb, user: { id: '99', role: 'ADMIN' } };

  it('returns a user by id', async () => {
    const fakeUser = { id: '1', name: 'Alice', email: 'a@test.com' };
    mockDb.users.findById.mockResolvedValue(fakeUser);

    const result = await Query.user(null, { id: '1' }, mockContext);
    expect(result).toEqual(fakeUser);
    expect(mockDb.users.findById).toHaveBeenCalledWith('1');
  });

  it('throws NOT_FOUND when user does not exist', async () => {
    mockDb.users.findById.mockResolvedValue(null);
    await expect(Query.user(null, { id: '999' }, mockContext))
      .rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});
```

### Integration testing with ApolloServer

```js
// Use the executeOperation API — no HTTP server needed, tests run fast

const { ApolloServer } = require('@apollo/server');
const { typeDefs }  = require('../../schema');
const { resolvers } = require('../../resolvers');

describe('GraphQL integration', () => {
  let server;
  let testDb;

  beforeAll(async () => {
    testDb = await createTestDatabase(); // seed an in-memory SQLite db
    server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    await testDb.close();
  });

  it('fetches a user by ID', async () => {
    const { body } = await server.executeOperation(
      {
        query: `query GetUser($id: ID!) { user(id: $id) { id name email } }`,
        variables: { id: '1' },
      },
      {
        // Inject context for this test
        contextValue: { db: testDb, user: null, loaders: createLoaders(testDb) },
      }
    );

    expect(body.kind).toBe('single');
    expect(body.singleResult.errors).toBeUndefined();
    expect(body.singleResult.data.user).toMatchObject({ id: '1', name: 'Alice' });
  });

  it('returns UNAUTHENTICATED when accessing protected field without token', async () => {
    const { body } = await server.executeOperation(
      { query: `query { me { id name } }` },
      { contextValue: { db: testDb, user: null, loaders: createLoaders(testDb) } }
    );

    expect(body.singleResult.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(body.singleResult.data.me).toBeNull();
  });
});
```

### End-to-end testing with supertest

```js
// e2e/user.e2e.test.js
const request = require('supertest');
const { app }  = require('../../server');  // export your Express app

describe('POST /graphql', () => {
  it('creates a user and returns it', async () => {
    const mutation = `
      mutation {
        createUser(input: { name: "Bob", email: "bob@test.com", role: VIEWER }) {
          id
          name
          email
        }
      }
    `;

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ query: mutation })
      .expect(200);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createUser).toMatchObject({
      name:  'Bob',
      email: 'bob@test.com',
    });
    expect(res.body.data.createUser.id).toBeDefined();
  });
});
```

---

## 20. Common Interview Questions

---

**Q: What is GraphQL and how does it differ from REST?**

```text
GraphQL is a query language and runtime for APIs developed by Facebook.
Unlike REST, which exposes multiple endpoints each with a fixed shape, GraphQL
exposes a single endpoint where clients specify exactly what data they need.

Key differences:
- Overfetching: REST returns fixed shapes, GraphQL returns only requested fields.
- Underfetching: REST may need multiple requests; GraphQL resolves nested data in one.
- Strong typing: GraphQL has a schema (SDL) that acts as a contract; REST has no built-in type system.
- Versioning: REST commonly uses URL versioning (/v2/users); GraphQL evolves the schema
  by deprecating fields rather than versioning.
- HTTP caching: REST GET requests are cached by browsers/CDNs; GraphQL POSTs are not by default.
```

---

**Q: What are the four resolver arguments?**

```text
Every resolver receives: (parent, args, context, info)

  parent  — the return value of the parent resolver. For root fields (Query/Mutation)
            this is undefined. For User.posts, parent is the User object.

  args    — the arguments passed to this field in the query.
            user(id: "42") → args = { id: "42" }

  context — a shared object for the entire request. Contains auth user, DB connection,
            DataLoader instances. Created fresh per request.

  info    — schema metadata: fieldName, returnType, path, etc. Rarely needed.
```

---

**Q: What is the N+1 problem and how do you fix it?**

```text
The N+1 problem: fetching a list of N users, then executing 1 DB query per user
to get their posts = N+1 total queries. For 100 users → 101 queries.

Root cause: GraphQL resolvers are invoked independently per item. Each User.posts
resolver only sees one user at a time and fires its own DB query.

Fix: DataLoader. It batches all .load() calls within the current event loop tick
into a single batch query. 100 individual loads become one:
  SELECT * FROM posts WHERE author_id IN (1, 2, ..., 100)

DataLoader also caches within a request, so the same ID never triggers two queries.
Critical: create a new DataLoader instance per request to prevent cross-request caching.
```

---

**Q: What is context in GraphQL and what belongs in it?**

```text
Context is a plain object created once per request and passed to every resolver
as the third argument. It is the correct place for:

  - The authenticated user (decoded from JWT/session)
  - Database / ORM instances (Prisma, Sequelize, Mongoose)
  - DataLoader instances (MUST be per-request)
  - Feature flags, request-scoped caches

It should NOT contain per-field state (resolvers should be stateless) or
module-level singletons (those belong at module scope, not rebuilt each request).
```

---

**Q: How does Apollo Client's InMemoryCache work?**

```text
Apollo Client normalizes query results into a flat key-value store.
The key for each object is: __typename + id  (e.g. "User:42")

Instead of storing the query result as a nested tree, Apollo stores each object
independently. References between objects are stored as pointers.

Result: if two different queries return the same User:42, they share the same
cache entry. A mutation that updates User:42 automatically refreshes ALL
components that reference it — without extra network requests.

If a type has no id, Apollo stores it embedded in its parent (not normalized).
```

---

**Q: What is the difference between @skip and @include?**

```text
Both are field-level directives that conditionally include/exclude fields.
They accept a Boolean argument:

  @include(if: $condition) — include the field ONLY IF the condition is true
  @skip(if: $condition)    — skip (exclude) the field IF the condition is true

They are logical inverses:
  email @include(if: $showEmail)  ≡  email @skip(if: $hideEmail)

They work on fields, inline fragments, and named fragment spreads.
Both can be used on the same field — if @skip is true it always wins.
```

---

**Q: Cursor pagination vs offset pagination — when to use each?**

```text
Offset pagination: users(limit: 10, offset: 20)
  ✓ Simple to implement
  ✗ Unstable with real-time data — new items shift positions, causing duplicates/gaps
  ✗ Expensive on large datasets (DB must scan rows 0→20 to skip them)

Cursor pagination: users(first: 10, after: "cursor")
  ✓ Stable — cursor anchors to a specific item, insertions don't affect it
  ✓ Efficient — DB uses the cursor (an index value) to start scanning from that point
  ✓ Relay spec is the GraphQL standard (edges/node/pageInfo/cursor)
  ✗ Cannot jump to page N directly (e.g. "go to page 5")
  ✗ More complex to implement

Use cursor pagination for most production GraphQL APIs.
Use offset when jump-to-page is needed and the dataset is small and stable.
```

---

**Q: What is Apollo Federation and why use it?**

```text
Apollo Federation lets you split one GraphQL schema across multiple independent
services (subgraphs), each owned by a different team.

Each subgraph owns a slice of the schema and declares which types it contributes
to or extends using federation directives (@key, @external, @requires).

A gateway (Apollo Router or Apollo Gateway) receives client queries, creates a
query plan (which subgraphs to call and in what order), fetches from each, and
merges the results into a single response.

Why use it:
  - Enables independent deployment of services
  - Each team owns their domain (users team owns User, posts team owns Post)
  - The graph grows without a central coordination bottleneck
  - Clients see one unified schema regardless of how many services exist
```

---

**Q: How do you secure a GraphQL API?**

```text
1. Depth limiting — reject queries nested deeper than N levels (graphql-depth-limit)
2. Complexity analysis — assign costs to fields; reject if total cost exceeds budget
3. Disable introspection in production — prevents schema reconnaissance
4. Rate limiting — at the HTTP layer per IP, or per user ID in context
5. Authentication — verify JWT in context; throw UNAUTHENTICATED in protected resolvers
6. Authorization — check user roles in resolvers; throw FORBIDDEN if insufficient
7. Input validation — validate mutation inputs with Joi/Zod; throw BAD_USER_INPUT
8. Persisted queries only — in production, only accept pre-registered query hashes
9. HTTPS — always; never expose GraphQL over HTTP in production
10. Error masking — formatError to hide internal error details in production
```

---

**Q: What are Automatic Persisted Queries (APQ) and why use them?**

```text
APQ is a protocol where Apollo Client sends a SHA-256 hash of the query instead
of the full query string on each request. If the server has seen this hash, it
executes the cached query. If not, the client resends with the full query, and
the server stores the hash→query mapping.

Benefits:
  - Reduces request payload size (hash = 64 chars vs potentially kilobytes)
  - GET requests are possible with hashes (enabling CDN/browser HTTP caching)
  - Improves performance for apps with large, repeated queries

In production, combine with persisted query lists (only allow pre-registered
queries) to completely prevent arbitrary query execution — maximum security.
```

---

**Q: What is the difference between interfaces and unions in GraphQL?**

```text
Interface:
  Defines a set of fields that multiple types MUST implement.
  Use when types share common fields.
  Clients can select shared fields without inline fragments.

  interface SearchResult { id: ID! title: String! }
  type Article implements SearchResult { id: ID! title: String! content: String! }
  type Video   implements SearchResult { id: ID! title: String! duration: Int! }

  query { search { id title ... on Video { duration } } }
  -- id and title work without inline fragments

Union:
  A field can be one of several types with NO required shared fields.
  All type-specific fields require inline fragments.

  union FeedItem = Post | Ad | Announcement
  query { feed { ... on Post { title } ... on Ad { sponsor } } }

Rule of thumb:
  Use interface when types share fields.
  Use union when types are completely unrelated.
```
