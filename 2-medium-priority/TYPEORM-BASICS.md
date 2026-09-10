# TypeORM — Beginner's Guide

**Priority: MEDIUM**

> A plain-language introduction to TypeORM: what an ORM is, how to define tables as
> TypeScript classes, how to read and write data, how relationships work, and the
> mistakes that catch everyone the first time.
>
> Assumes you know TypeScript basics and roughly what a database table is. No prior
> ORM experience needed.

---

## Table of Contents

1. [What Is an ORM, and Why Use One?](#1-what-is-an-orm-and-why-use-one)
2. [Setting Up](#2-setting-up)
3. [The DataSource — Your Connection](#3-the-datasource--your-connection)
4. [Entities — Tables as Classes](#4-entities--tables-as-classes)
5. [Column Types & Options](#5-column-types--options)
6. [The Repository — Reading and Writing](#6-the-repository--reading-and-writing)
7. [Finding Data](#7-finding-data)
8. [Relationships](#8-relationships)
9. [Loading Related Data](#9-loading-related-data)
10. [QueryBuilder — When `find()` Is Not Enough](#10-querybuilder--when-find-is-not-enough)
11. [Migrations — Changing Your Schema Safely](#11-migrations--changing-your-schema-safely)
12. [Using TypeORM with NestJS](#12-using-typeorm-with-nestjs)
13. [Common Beginner Mistakes](#13-common-beginner-mistakes)
14. [Cheat Sheet](#14-cheat-sheet)
15. [Where to Go Next](#15-where-to-go-next)

---

## 1. What Is an ORM, and Why Use One?

```text
ORM stands for Object-Relational Mapping.

  "Relational"  = your database (Postgres, MySQL) stores data in TABLES
                  made of rows and columns.
  "Object"      = your TypeScript code works with OBJECTS and CLASSES.
  "Mapping"     = the ORM translates automatically between the two.

‼️ In one sentence: an ORM lets you write `user.email` instead of
   `rows[0]['email']`, and `repo.save(user)` instead of writing an INSERT
   statement by hand.

TypeORM is one such library for TypeScript/JavaScript. Its main competitors are
Prisma and Drizzle. TypeORM's distinguishing idea is that your TABLES ARE
CLASSES — you describe a table by writing a class with decorators on it.
```

### The same task, with and without an ORM

```typescript
// ── WITHOUT an ORM (raw SQL through the `pg` driver) ──────────────────────
const result = await pool.query(
  'SELECT id, email, created_at FROM users WHERE email = $1',
  ['ada@example.com'],
);

// `result.rows` is an array of plain objects. TypeScript has no idea what is
// inside them — it is typed as `any`. If you typo `row.emial`, nothing warns
// you; you find out in production when it prints `undefined`.
const row = result.rows[0];
console.log(row.email);

// Column names come back exactly as the database spells them, so you deal with
// snake_case here and camelCase everywhere else in your codebase.
console.log(row.created_at);
```

```typescript
// ── WITH TypeORM ──────────────────────────────────────────────────────────
const user = await userRepository.findOneBy({ email: 'ada@example.com' });

// `user` is typed as `User | null`. Your editor autocompletes the properties,
// and typing `user.emial` is a compile error, not a 3am bug.
console.log(user.email);

// Naming is consistent with the rest of your code — the ORM handles the
// snake_case ↔ camelCase translation for you.
console.log(user.createdAt);   // a real JavaScript Date object, already parsed
```

```text
‼️ THE HONEST TRADE-OFF — worth knowing before you commit to an ORM.

  WHAT YOU GAIN
    - Type safety and autocomplete on your data.
    - No hand-written SQL for the ~80% of queries that are simple.
    - Automatic protection against SQL injection (values are parameterised).
    - Migrations: a versioned, reviewable history of every schema change.
    - Portability: mostly the same code against Postgres, MySQL, or SQLite.

  WHAT YOU PAY
    - A layer of abstraction to learn, with its own quirks and vocabulary.
    - It is easy to write code that LOOKS cheap and generates terrible SQL
      (see the N+1 problem in §9). The ORM hides the cost until it hurts.
    - Complex analytical queries are often clearer as plain SQL. Every good ORM
      including TypeORM lets you drop down to raw SQL — and you should, when
      the query builder starts fighting you.

  ‼️ An ORM does not remove the need to understand SQL. It removes the need to
     TYPE most of it. When something is slow, you will still read the generated
     SQL and think about indexes.
```

---

## 2. Setting Up

```bash
# The ORM itself, plus a driver for your specific database.
npm install typeorm reflect-metadata

# Pick ONE driver to match your database:
npm install pg          # PostgreSQL  ← the most common choice
npm install mysql2      # MySQL / MariaDB
npm install sqlite3     # SQLite      ← easiest for learning, zero setup
npm install mssql       # SQL Server
```

```jsonc
// tsconfig.json — TypeORM will not work without these two flags.
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",

    // ‼️ These two are REQUIRED. TypeORM works by reading the @Column() and
    // @Entity() decorators on your classes, and by reading the TypeScript
    // types of your properties. Without these flags, that information does not
    // survive compilation and TypeORM sees nothing.
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,

    // Entity classes declare properties without initialising them (the database
    // fills them in), which this rule would otherwise complain about.
    "strictPropertyInitialization": false
  }
}
```

```typescript
// ‼️ The single most common "why doesn't anything work?" mistake:
// This import MUST be the FIRST line of your application's entry point.
// It installs the polyfill that lets decorators store metadata. If it is
// missing, or imported too late, you get confusing errors about missing
// metadata or undefined column types.
import 'reflect-metadata';

// ...everything else comes after.
```

---

## 3. The DataSource — Your Connection

```typescript
// A DataSource holds your database connection settings and the connection pool.
// You create ONE of these for your whole application.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',              // which database driver to use
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'my_app',

  // The list of entity classes TypeORM should manage. You can also use a glob
  // pattern like ['src/entities/*.entity.ts'], but listing them explicitly is
  // clearer and gives you a compile error if you delete one by accident.
  entities: [User, Post],

  // ‼️ THE MOST DANGEROUS SETTING IN TYPEORM.
  // `synchronize: true` makes TypeORM compare your entity classes to the real
  // database on every startup and ALTER the database to match.
  //
  // That sounds convenient, and it is — while you are learning, alone, with
  // throwaway data. But it will also happily DROP A COLUMN (and everything in
  // it) the moment you rename a property, with no warning and no undo.
  //
  // Rule: `true` on your laptop while learning. NEVER anywhere real. Use
  // migrations instead (§11).
  synchronize: true,

  // Prints every SQL statement TypeORM generates to the console. Turn this on
  // while learning — seeing the actual SQL is the fastest way to understand
  // what the ORM is doing on your behalf, and to notice when it is doing
  // something silly.
  logging: true,
});

// .initialize() opens the connection pool. It returns a Promise, so it must be
// awaited before you run any query.
async function main() {
  await AppDataSource.initialize();
  console.log('Database connected');

  // ... your code here ...

  // Closes the pool. Without this, your script will hang instead of exiting,
  // because open database sockets keep the Node process alive.
  await AppDataSource.destroy();
}
main();
```

```typescript
// ── An easier starting point: SQLite ──────────────────────────────────────
// No server to install, no credentials. The whole database is one file, and
// deleting that file resets everything — ideal while you are experimenting.
export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'dev.sqlite',   // created automatically on first run
  entities: [User, Post],
  synchronize: true,
  logging: true,
});
```

---

## 4. Entities — Tables as Classes

```typescript
// An ENTITY is a class that describes one database table.
// One entity class = one table. One instance of that class = one row.
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity() marks the class as a table. The argument is the table name; leave
// it out and TypeORM derives the name from the class name ("User" → "user").
// ‼️ Passing it explicitly is better — renaming your class then cannot silently
// rename your table.
@Entity('users')
export class User {
  // Every table needs a primary key: the column that uniquely identifies a row.
  //
  // 'uuid'      → a random string like '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
  //               Safe to expose publicly and generate outside the database.
  // 'increment' → 1, 2, 3, ...  Simpler and smaller, but exposes how many
  //               records you have, and lets anyone guess other valid ids.
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // A basic column. TypeORM infers the SQL type from the TypeScript type:
  //   string → varchar,  number → integer,  boolean → boolean,  Date → timestamp
  @Column()
  email: string;

  // Options let you control the generated column precisely.
  @Column({
    length: 100,        // varchar(100) instead of the default varchar(255)
    nullable: true,     // this column is allowed to hold NULL
  })
  displayName: string | null;

  // ‼️ `unique: true` creates a UNIQUE INDEX in the database, which is the only
  // reliable way to prevent duplicates. Checking "does this email exist?" in
  // your code first is NOT enough: two requests arriving at the same moment
  // both see nothing, and both insert. The database constraint is what
  // actually stops it.
  @Column({ unique: true })
  username: string;

  // `select: false` keeps this column out of every normal query result. You
  // have to explicitly ask for it. Perfect for password hashes — a forgotten
  // `find()` then cannot accidentally leak them into an API response.
  @Column({ select: false })
  passwordHash: string;

  @Column({ default: true })
  isActive: boolean;

  // These two are filled in and maintained by TypeORM automatically. You never
  // set them yourself.
  @CreateDateColumn()   // set once, when the row is first inserted
  createdAt: Date;

  @UpdateDateColumn()   // updated every time the row is saved
  updatedAt: Date;
}
```

```text
WHAT THAT CLASS PRODUCES IN THE DATABASE

  CREATE TABLE "users" (
    "id"            uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email"         varchar(255)  NOT NULL,
    "displayName"   varchar(100),
    "username"      varchar(255)  NOT NULL UNIQUE,
    "passwordHash"  varchar(255)  NOT NULL,
    "isActive"      boolean       NOT NULL DEFAULT true,
    "createdAt"     timestamp     NOT NULL DEFAULT now(),
    "updatedAt"     timestamp     NOT NULL DEFAULT now()
  );

‼️ Notice that columns are NOT NULL by default. TypeORM assumes a column is
   required unless you write `nullable: true`. This is the opposite of what
   many people expect, and it is the right default — it forces you to think
   about whether missing data is genuinely allowed.
```

---

## 5. Column Types & Options

```typescript
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── TEXT ────────────────────────────────────────────────────────────────
  @Column({ length: 200 })
  name: string;                       // varchar(200) — for short, bounded text

  @Column({ type: 'text', nullable: true })
  description: string | null;         // unlimited length — for long prose

  // ── NUMBERS ─────────────────────────────────────────────────────────────
  @Column({ type: 'int' })
  stockCount: number;

  // ‼️ NEVER store money as a float. Floating-point numbers cannot represent
  // 0.1 exactly, so repeated arithmetic drifts: 0.1 + 0.2 === 0.30000000000000004.
  // Use `decimal` with an explicit precision, or store whole cents as an integer.
  //
  //   precision: 10 = ten total digits
  //   scale: 2      = two of them after the decimal point  →  max 99,999,999.99
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;
  // ‼️ Note the type is `string`, not `number`. Postgres returns `decimal` as a
  // string precisely so JavaScript cannot silently lose precision. Convert with
  // a decimal library when you do arithmetic — not with parseFloat.

  // ── BOOLEAN ─────────────────────────────────────────────────────────────
  @Column({ default: false })
  isPublished: boolean;

  // ── DATES ───────────────────────────────────────────────────────────────
  // ‼️ Always prefer `timestamptz` (timestamp WITH time zone) over `timestamp`.
  // Plain `timestamp` stores a wall-clock reading with no time zone attached,
  // so the same value means different moments to different users — and daylight
  // saving transitions become genuinely ambiguous.
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  releaseDate: string | null;         // a calendar date with no time component

  // ── ENUM ────────────────────────────────────────────────────────────────
  // The database itself rejects any value outside the list, so invalid data
  // cannot get in even through a manual SQL statement.
  @Column({ type: 'enum', enum: ['draft', 'active', 'archived'], default: 'draft' })
  status: 'draft' | 'active' | 'archived';

  // ── JSON ────────────────────────────────────────────────────────────────
  // ‼️ Use `jsonb` on Postgres, not `json`. jsonb is stored in a parsed binary
  // form, so it is faster to query and can be indexed. Plain `json` stores the
  // raw text and has to re-parse it every time.
  //
  // Good for genuinely unstructured data (per-user settings, third-party API
  // payloads). Bad as a way to avoid designing a schema — you lose type safety,
  // constraints, and easy querying.
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  // ── ARRAY (Postgres only) ───────────────────────────────────────────────
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  // ── COLUMN NAME MAPPING ─────────────────────────────────────────────────
  // Your code uses camelCase; the database column is snake_case. Common when
  // working with an existing database or a team with SQL naming conventions.
  @Column({ name: 'vendor_sku' })
  vendorSku: string;
}
```

```typescript
// ── SPECIAL COLUMNS ───────────────────────────────────────────────────────
@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // SOFT DELETE: instead of really removing the row, TypeORM sets this column
  // to the current time. Every subsequent query automatically adds
  // "WHERE deletedAt IS NULL", so the row disappears from your app but the data
  // is still recoverable.
  @DeleteDateColumn()
  deletedAt: Date | null;

  // OPTIMISTIC LOCKING: TypeORM increments this on every save, and refuses a
  // save whose version does not match what is currently in the database.
  //
  // This is how you stop two people who opened the same edit form from silently
  // overwriting each other — the second save fails instead of winning, and you
  // can tell the user "this changed while you were editing."
  @VersionColumn()
  version: number;
}
```

```text
‼️ HOW TO CHOOSE A COLUMN TYPE — a rule that will not steer you wrong:

   Pick the MOST RESTRICTIVE type that fits the data.

   A column typed `varchar(20)` and NOT NULL tells you, and the database, and
   the next developer, exactly what may be in there. A column typed `text` and
   nullable tells you nothing, and eventually holds four different kinds of
   value because nothing stopped it.

   The database is the last line of defence for data quality. Validation in
   your application can be bypassed — by a script, a migration, a colleague
   with psql open. A constraint cannot.
```

---

## 6. The Repository — Reading and Writing

```typescript
// A REPOSITORY is the object you use to work with one entity's table.
// You get one from the DataSource:
const userRepo = AppDataSource.getRepository(User);
```

```typescript
// ── CREATING ──────────────────────────────────────────────────────────────

// .create() builds an entity instance IN MEMORY. It does NOT touch the
// database — no INSERT happens here. It exists so that defaults and types are
// applied before you save.
const user = userRepo.create({
  email: 'ada@example.com',
  username: 'ada',
  passwordHash: 'hashed...',
});

// .save() is what actually writes to the database, and it returns the saved
// entity with any database-generated values (like `id` and `createdAt`) filled in.
const saved = await userRepo.save(user);
console.log(saved.id);   // → the uuid the database generated

// ‼️ .save() IS SMARTER THAN IT LOOKS, AND THAT CATCHES PEOPLE OUT.
// It checks whether the object has a primary key:
//   no id  → runs an INSERT (creates a new row)
//   has id → runs an UPDATE (updates the existing row)
//
// This is convenient, but it means a bug that accidentally clears an `id`
// turns an intended update into a surprise new row. When you KNOW which
// operation you want, being explicit is safer:
await userRepo.insert({ email: 'x@y.com', username: 'x', passwordHash: '...' });
await userRepo.update({ id: someId }, { displayName: 'New Name' });
```

```typescript
// ── READING ───────────────────────────────────────────────────────────────

// One row by simple equality — the most common lookup you will write.
// Returns the entity, or null if nothing matched.
const user = await userRepo.findOneBy({ email: 'ada@example.com' });

// The longer form, needed when you want options beyond a plain WHERE.
const user2 = await userRepo.findOne({
  where: { email: 'ada@example.com' },
  select: { id: true, email: true },
});

// Like findOne, but THROWS if nothing is found instead of returning null.
// Useful when a missing row is genuinely a bug and you would rather fail loudly.
const user3 = await userRepo.findOneByOrFail({ id: someId });

// Many rows.
const users = await userRepo.find({ where: { isActive: true } });

// Rows plus the total count, in one call. This is what you want for a paginated
// list, where you need both "this page's rows" and "how many pages exist".
const [rows, total] = await userRepo.findAndCount({ take: 20, skip: 0 });

// Just a count, no rows fetched.
const activeCount = await userRepo.countBy({ isActive: true });

// Just a yes/no. Cheaper than counting when you only care whether any exist.
const exists = await userRepo.existsBy({ email: 'ada@example.com' });
```

```typescript
// ── UPDATING ──────────────────────────────────────────────────────────────

// Approach 1: load it, change it, save it.
// Use this when the new values depend on the current ones, or when you want
// entity behaviour (validation, subscribers, @UpdateDateColumn) to run.
const user = await userRepo.findOneBy({ id });
user.displayName = 'Ada Lovelace';
await userRepo.save(user);

// Approach 2: update in place, without loading first.
// One query instead of two, so it is faster — but it skips loading the entity,
// so nothing that depends on the old values can run.
await userRepo.update({ id }, { displayName: 'Ada Lovelace' });

// ‼️ .update() does NOT throw when nothing matched. It silently affects zero
// rows. If a missing row should be an error, check the result:
const result = await userRepo.update({ id }, { displayName: 'Ada' });
if (result.affected === 0) {
  throw new Error(`No user with id ${id}`);
}
```

```typescript
// ── DELETING ──────────────────────────────────────────────────────────────

// Permanently removes matching rows. Gone for good.
await userRepo.delete({ id });

// Takes a loaded entity instead of a condition. Slightly different internals,
// same outcome.
const user = await userRepo.findOneBy({ id });
await userRepo.remove(user);

// If your entity has a @DeleteDateColumn, this sets it instead of deleting.
// The row stays in the table but disappears from every normal query.
await userRepo.softDelete({ id });

// And brings it back.
await userRepo.restore({ id });

// To see soft-deleted rows again, ask for them explicitly:
const all = await userRepo.find({ withDeleted: true });
```

---

## 7. Finding Data

```typescript
// ── THE FIND OPTIONS OBJECT ───────────────────────────────────────────────
const users = await userRepo.find({
  // WHERE: which rows to return.
  where: { isActive: true },

  // SELECT: which columns to return. Everything by default.
  // ‼️ Worth setting on any query that runs often. `SELECT *` on a table with
  // a large text or jsonb column pulls that data over the network every time,
  // even when you only wanted the id and the name.
  select: { id: true, email: true, displayName: true },

  // ORDER BY. Without it, the database makes no promise about row order — and
  // "it seemed ordered when I tested" is not a guarantee.
  order: { createdAt: 'DESC', id: 'ASC' },

  // LIMIT and OFFSET — pagination.
  // ‼️ Set `take` on every list endpoint. Without it, a table that grows to a
  // million rows will one day try to load a million rows into memory at once.
  take: 20,     // return at most 20 rows
  skip: 40,     // after skipping the first 40  (this is page 3)
});
```

```typescript
// ── WHERE CONDITIONS ──────────────────────────────────────────────────────
import { Like, ILike, In, Not, IsNull, MoreThan, LessThan, Between } from 'typeorm';

// Multiple properties in ONE object are combined with AND.
await userRepo.find({
  where: { isActive: true, role: 'admin' },
});
// → WHERE "isActive" = true AND "role" = 'admin'

// An ARRAY of objects is combined with OR.
await userRepo.find({
  where: [
    { role: 'admin' },
    { role: 'moderator' },
  ],
});
// → WHERE "role" = 'admin' OR "role" = 'moderator'

// ── Operators, for anything beyond plain equality ─────────────────────────
await userRepo.find({
  where: {
    // Text matching. `%` means "any characters here".
    email: Like('%@example.com'),      // ends with @example.com
    displayName: ILike('%ada%'),       // ILike = case-insensitive (Postgres)

    // Membership — becomes a SQL IN (...) clause.
    role: In(['admin', 'moderator']),

    // Negation — wraps any other condition.
    status: Not('banned'),
    deletedAt: Not(IsNull()),

    // NULL checks. ‼️ You cannot write `deletedAt: null` and have it work as
    // "IS NULL" reliably — SQL requires the IS NULL form, which is what this
    // helper produces.
    lastLoginAt: IsNull(),

    // Comparisons.
    age: MoreThan(18),                 // > 18   (MoreThanOrEqual also exists)
    score: LessThan(100),              // < 100
    createdAt: Between(startDate, endDate),   // inclusive on both ends
  },
});
```

```typescript
// ── PAGINATION, THE WAY YOU WILL ACTUALLY WRITE IT ────────────────────────
async function listUsers(page = 1, limit = 20) {
  // ‼️ Always cap the limit. Without this line, a request for ?limit=1000000
  // is a free way for anyone to exhaust your server's memory.
  const safeLimit = Math.min(limit, 100);

  const [items, total] = await userRepo.findAndCount({
    where: { isActive: true },
    order: { createdAt: 'DESC' },
    take: safeLimit,
    skip: (page - 1) * safeLimit,
  });

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / safeLimit),
  };
}

// ‼️ A limitation worth knowing early: `skip` becomes SQL OFFSET, and OFFSET
// gets slower the deeper you go. OFFSET 100000 makes the database read and
// throw away 100,000 rows before returning yours. It is perfectly fine for the
// first few dozen pages; when a table gets large, the fix is "cursor" or
// "keyset" pagination — remembering the last row you saw and asking for rows
// after it, instead of counting from the start.
```

---

## 8. Relationships

```text
Relationships are how tables connect. There are three shapes, and the whole
subject becomes much easier once you can picture them.

‼️ THE KEY CONCEPT: the FOREIGN KEY.
   A foreign key is just a column in one table that stores the id of a row in
   another table. That is the entire mechanism. Everything below is about
   WHICH table holds that column.

  ONE-TO-ONE       One user has one profile. One profile belongs to one user.
                   users ──── profiles

  ONE-TO-MANY      One user writes many posts. Each post has one author.
  / MANY-TO-ONE    users ────< posts        ← by far the most common
                   ‼️ The foreign key lives on the MANY side. A post stores its
                      author's id, because a post has exactly one author. The
                      user cannot store "the post ids" in one column.

  MANY-TO-MANY     A post has many tags. A tag is on many posts.
                   posts >──< tags
                   ‼️ Neither table can hold the key, so a THIRD table (a "join
                      table") stores the pairs: (post_id, tag_id).
```

### One-to-Many / Many-to-One

```typescript
// ── The "many" side: Post. This is where the foreign key column lives. ────
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  // @ManyToOne: "many posts belong to one user".
  //
  // The first argument is a FUNCTION returning the other class, not the class
  // itself. ‼️ That matters: entity files often import each other, and a direct
  // reference would be `undefined` at the moment this decorator runs. Wrapping
  // it in an arrow function delays the lookup until both classes exist.
  //
  // The second argument points back at the matching property on the other side,
  // so TypeORM knows these two decorators describe the SAME relationship.
  @ManyToOne(() => User, (user) => user.posts, {
    // What the DATABASE does if the author is deleted:
    //   'CASCADE'  → delete this post too
    //   'SET NULL' → keep the post, clear the author (column must be nullable)
    //   'RESTRICT' → refuse to delete the user while posts still reference them
    // ‼️ Enforcing this in the database is stronger than doing it in code —
    // it holds even for a manual SQL delete or a migration script.
    onDelete: 'CASCADE',
    nullable: false,
  })
  author: User;

  // ‼️ Mapping the foreign key as its OWN property is a small change with a big
  // payoff: you can read `post.authorId` and set the relation by id, without
  // loading the entire User row from the database just to make a connection.
  @Column()
  authorId: string;
}

// ── The "one" side: User. No foreign key column here. ─────────────────────
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @OneToMany: "one user has many posts".
  //
  // ‼️ This side creates NO column in the `users` table. It is purely a
  // convenience so you can write `user.posts`. The actual link is the
  // `authorId` column over on `posts`. A @OneToMany without a matching
  // @ManyToOne on the other side does not work at all.
  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

### One-to-One

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;
}

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  // ‼️ In a one-to-one, EITHER table could hold the foreign key, so TypeORM
  // cannot guess. @JoinColumn is how you say "put the column on THIS side."
  // Exactly one of the two sides must have it — put it on the side that is
  // optional or less central (a profile without a user makes no sense, so the
  // key goes on profiles).
  @JoinColumn()
  user: User;

  @Column()
  userId: string;
}
```

### Many-to-Many

```typescript
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Tag, (tag) => tag.posts)
  // ‼️ @JoinTable tells TypeORM to create the third, hidden table that stores
  // the pairs. As with @JoinColumn, exactly ONE of the two sides gets it —
  // that side is called the "owning" side. Put it on whichever feels like the
  // primary one; a post owning its tags reads naturally.
  @JoinTable({
    name: 'post_tags',        // name the join table explicitly
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Tag[];
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  // The other side. No @JoinTable here — only one side may have it.
  @ManyToMany(() => Post, (post) => post.tags)
  posts: Post[];
}
```

```typescript
// ── Working with a many-to-many ───────────────────────────────────────────
// Add tags to a post: load the post WITH its tags, change the array, save.
const post = await postRepo.findOne({
  where: { id: postId },
  relations: { tags: true },   // ‼️ must load them, or you overwrite with []
});

const tag = await tagRepo.findOneBy({ name: 'typescript' });
post.tags.push(tag);
await postRepo.save(post);     // TypeORM works out the join-table rows to insert

// ‼️ THE TRAP: if you had NOT loaded `relations: { tags: true }`, then
// `post.tags` would be undefined. Setting it to a fresh array and saving would
// DELETE every existing tag link, because you just told TypeORM the complete
// list of tags is your new one-element array.
```

```typescript
// ── cascade: saving related entities together ─────────────────────────────
@OneToMany(() => Post, (post) => post.author, {
  // With cascade, saving a user also saves any new posts attached to it, in
  // one operation. Without it, you must save the posts separately.
  cascade: ['insert', 'update'],
})
posts: Post[];

// With the cascade above, this one call inserts the user AND both posts:
const user = userRepo.create({
  email: 'ada@example.com',
  posts: [
    postRepo.create({ title: 'First post' }),
    postRepo.create({ title: 'Second post' }),
  ],
});
await userRepo.save(user);

// ‼️ Use cascade sparingly, and avoid `cascade: true` (which turns on ALL
// operations including remove). It makes a single .save() capable of writing
// to several tables, which is convenient right up until a stray change deletes
// rows you did not realise were in scope.
```

---

## 9. Loading Related Data

```typescript
// ‼️ By default, relations are NOT loaded. This surprises everyone once.
const user = await userRepo.findOneBy({ id });
console.log(user.posts);   // → undefined, NOT an empty array

// You have to ask for them:
const user2 = await userRepo.findOne({
  where: { id },
  relations: { posts: true },
});
console.log(user2.posts);  // → [Post, Post, Post]

// Nested relations, as deep as you need:
const user3 = await userRepo.findOne({
  where: { id },
  relations: {
    posts: {
      comments: true,      // each post's comments too
      tags: true,
    },
    profile: true,
  },
});

// You can select specific columns from a relation as well:
const user4 = await userRepo.findOne({
  where: { id },
  relations: { posts: true },
  select: {
    id: true,
    email: true,
    posts: { id: true, title: true },   // not the post bodies
  },
});
```

### The N+1 problem

```typescript
// ‼️ THE MOST COMMON PERFORMANCE BUG IN ANY ORM. Learn to spot it now and you
// will save yourself a bad afternoon later.

// ── THE BAD VERSION ───────────────────────────────────────────────────────
const users = await userRepo.find();                    // 1 query

for (const user of users) {
  // This line runs once PER USER. With 100 users, that is 100 more queries.
  user.posts = await postRepo.findBy({ authorId: user.id });
}
// Total: 101 queries. Hence the name — 1 query, plus N more.
//
// Each individual query is fast (maybe 1ms), which is exactly why this hides
// so well in development with 5 test users. With 500 real users it is 500
// round trips to the database, one after another, and the endpoint takes half
// a second doing essentially nothing.

// ── THE GOOD VERSION ──────────────────────────────────────────────────────
const users2 = await userRepo.find({
  relations: { posts: true },   // TypeORM fetches everything efficiently
});
// Total: 1–2 queries, regardless of how many users there are.
```

```text
‼️ HOW TO CATCH IT

  Turn on `logging: true` in your DataSource and watch the console while you
  hit an endpoint. If you see the same query repeated over and over with only
  the id changing, that is an N+1 and you have found it.

  This is also why `logging: true` is worth keeping on while you are learning —
  the ORM's whole job is to hide SQL from you, and watching the SQL is how you
  learn what it is actually doing on your behalf.
```

```typescript
// ── eager: true — convenient, and a trap ──────────────────────────────────
@OneToMany(() => Post, (post) => post.author, { eager: true })
posts: Post[];

// Now EVERY find() on User automatically joins and loads posts, without asking.
// That sounds helpful, and it is — until a simple "count the active users"
// query starts dragging every post in the database along with it.
//
// ‼️ Prefer being explicit with `relations` at each call site. It is one extra
// line, and it keeps the cost of a query visible where you can see it.
```

---

## 10. QueryBuilder — When `find()` Is Not Enough

```typescript
// `find()` covers most everyday queries. When you need something it cannot
// express — a complex OR, an aggregate, a subquery, a join with conditions —
// QueryBuilder lets you assemble SQL piece by piece while staying type-aware.

const users = await userRepo
  // The string 'user' is an ALIAS — a short name for this table that you use
  // to refer to its columns in the conditions below.
  .createQueryBuilder('user')

  // A join that also SELECTS the joined data into the result.
  // 'leftJoin' alone would join for filtering but not return the posts.
  // "left" means users with no posts are still included; an inner join would
  // silently drop them.
  .leftJoinAndSelect('user.posts', 'post')

  // ‼️ ALWAYS use :placeholders and pass values in the second argument.
  // NEVER build the string yourself with template literals:
  //     .where(`user.email = '${email}'`)     ← SQL INJECTION. Do not do this.
  // The placeholder form sends the value separately from the query, so the
  // database can never mistake user input for SQL commands.
  .where('user.isActive = :active', { active: true })

  .andWhere('user.createdAt > :since', { since: new Date('2024-01-01') })

  // Grouped OR conditions — the main thing `find()` cannot express cleanly.
  .andWhere('(user.role = :admin OR user.role = :mod)', {
    admin: 'admin',
    mod: 'moderator',
  })

  .orderBy('user.createdAt', 'DESC')
  .addOrderBy('user.email', 'ASC')     // tiebreaker

  .take(20)     // ‼️ take/skip understand entities and handle joins correctly
  .skip(0)      //    limit/offset are raw SQL and get pagination wrong when
                //    a join multiplies your rows — prefer take/skip here

  .getMany();   // → User[]
```

```typescript
// ── The methods that end a QueryBuilder ───────────────────────────────────
.getOne()          // → Entity | null
.getOneOrFail()    // → Entity, throws if not found
.getMany()         // → Entity[]
.getManyAndCount() // → [Entity[], number]  — for pagination
.getCount()        // → number
.getRawOne()       // → a plain object, not an entity — for aggregates
.getRawMany()      // → plain objects, useful when selecting computed columns
.execute()         // for INSERT / UPDATE / DELETE builders
```

```typescript
// ── Aggregates: use the "raw" methods ─────────────────────────────────────
// COUNT, SUM, and AVG do not produce entities, so ask for raw results.
const stats = await postRepo
  .createQueryBuilder('post')
  .select('post.authorId', 'authorId')
  .addSelect('COUNT(*)', 'postCount')
  .groupBy('post.authorId')
  .having('COUNT(*) > :min', { min: 5 })
  .getRawMany();
// → [{ authorId: '...', postCount: '12' }, ...]
// ‼️ Postgres returns COUNT as a string (it can exceed JavaScript's safe
// integer range), so convert it before doing arithmetic.
```

```typescript
// ── Raw SQL, when the query builder is more trouble than it is worth ──────
// There is no shame in this. Complex reporting queries are usually clearer as
// SQL, and TypeORM is fine with that.
const rows = await AppDataSource.query(
  `SELECT u.email, COUNT(p.id) AS post_count
     FROM users u
     LEFT JOIN posts p ON p.author_id = u.id
    WHERE u.created_at > $1
    GROUP BY u.email
    ORDER BY post_count DESC
    LIMIT 10`,
  [new Date('2024-01-01')],   // ‼️ still parameterised — never interpolate
);
```

---

## 11. Migrations — Changing Your Schema Safely

```text
‼️ WHY MIGRATIONS EXIST

  While learning, `synchronize: true` quietly reshapes your database to match
  your entities on every restart. That is fine when the data is disposable.

  It is catastrophic on real data. Rename a property from `name` to `fullName`
  and synchronize sees "a column disappeared and a new one appeared" — so it
  DROPS the name column, taking every value with it, and adds an empty one.
  No warning, no confirmation, no undo.

  A MIGRATION is a file containing the exact SQL for one schema change, plus
  the SQL to undo it. Migrations are committed to git, reviewed like code, and
  applied in order. Your database schema gets a version history, and every
  environment ends up in the same state.

  Rule: `synchronize: true` while learning on a throwaway database.
        Migrations everywhere else, from the first real user onward.
```

```typescript
// ── data-source.ts — the CLI needs its own DataSource file ────────────────
import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,          // ‼️ off, always, once you use migrations
});
```

```bash
# ── The three commands you need ───────────────────────────────────────────

# 1. GENERATE — compares your entities to the current database and writes a
#    migration file containing the difference. This does most of the work.
npx typeorm-ts-node-commonjs migration:generate src/migrations/AddUserRole \
  -d src/data-source.ts

# 2. RUN — applies any migrations that have not been applied yet.
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts

# 3. REVERT — undoes the most recent migration.
npx typeorm-ts-node-commonjs migration:revert -d src/data-source.ts

# ‼️ Add these to package.json scripts — the full command is far too long to
# type repeatedly, and people who cannot remember it stop using migrations.
```

```typescript
// ── What a generated migration looks like ─────────────────────────────────
import { MigrationInterface, QueryRunner } from 'typeorm';

// The number in the class name is a timestamp. It is what determines the order
// migrations run in, and why two developers can create migrations on the same
// day without conflicting.
export class AddUserRole1730000000000 implements MigrationInterface {
  // up() = apply the change.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT 'user'`,
    );
  }

  // down() = undo it.
  // ‼️ ALWAYS check that the generated down() is correct, and test it once by
  // actually running migration:revert. A rollback you have never tried is a
  // rollback that does not work — and you find that out during an incident,
  // which is the worst possible moment.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
```

```text
‼️ MIGRATION RULES THAT SAVE PAIN LATER

  1. ALWAYS READ the generated file before committing it. `migration:generate`
     is a good guesser, not an oracle. It cannot tell a rename from a
     drop-plus-add, so it will write the destructive version — you have to fix
     that by hand.

  2. NEVER edit a migration that has already run somewhere else. Its effects
     are already applied there; editing it just means environments silently
     diverge. Write a new migration instead.

  3. Adding a NOT NULL column to a table with existing rows FAILS unless you
     give it a default, or do it in three steps: add it nullable, fill in the
     existing rows, then add the NOT NULL constraint.

  4. Commit migrations with the code change that needs them. A deploy where the
     code expects a column the database does not have yet is an outage.
```

---

## 12. Using TypeORM with NestJS

```typescript
// ── Connect once, in the root module ──────────────────────────────────────
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,

      // Picks up every entity registered by forFeature() below, so you do not
      // have to maintain a second list of entity paths.
      autoLoadEntities: true,

      synchronize: false,   // ‼️ migrations only, as always
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

```typescript
// ── Register the entity in its feature module ─────────────────────────────
@Module({
  // forFeature makes the User repository injectable inside THIS module.
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

```typescript
// ── Inject and use it ─────────────────────────────────────────────────────
@Injectable()
export class UsersService {
  constructor(
    // @InjectRepository is how you ask Nest for the repository that
    // forFeature([User]) registered above.
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findAll() {
    // From here on it is exactly the same repository API as everywhere else in
    // this file — Nest only changes how you GET the repository, not how you
    // use it.
    return this.repo.find({ take: 50, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
```

> For transactions, connection pooling, advanced relations, and production concerns,
> see [NESTJS-DEEP.md §16](NESTJS-DEEP.md#16-persistence--typeorm) and
> [§19](NESTJS-DEEP.md#19-transactions--the-unit-of-work-problem).

---

## 13. Common Beginner Mistakes

```text
‼️ 1. Forgetting `import 'reflect-metadata'` at the top of the entry file.
   Symptom: confusing errors about missing metadata, or column types coming out
   as `Object`. It must be the FIRST import in your application.

‼️ 2. Leaving `synchronize: true` on with real data.
   It will drop a column and its contents the first time you rename a property.
   Switch to migrations before anyone depends on the data.

‼️ 3. Expecting relations to be loaded automatically.
   `user.posts` is `undefined`, not `[]`, unless you asked for
   `relations: { posts: true }`. This catches everybody exactly once.

‼️ 4. The N+1 query problem.
   Looping over results and querying inside the loop. Use `relations` instead.
   Turn on `logging: true` and watch for the same query repeating.

‼️ 5. Saving a relation you did not load.
   Setting `post.tags = [newTag]` when tags were never loaded tells TypeORM the
   complete new list is that one tag — deleting every other link. Load first.

‼️ 6. Assuming `.update()` and `.delete()` throw when nothing matches.
   They do not. They report `affected: 0` and carry on. Check it yourself if a
   missing row should be an error.

‼️ 7. Referencing entity classes directly in relation decorators.
   Use `@ManyToOne(() => User, ...)`, not `@ManyToOne(User, ...)`. Entity files
   import each other, and the arrow function is what stops the circular import
   from producing `undefined`.

‼️ 8. Forgetting @JoinColumn (one-to-one) or @JoinTable (many-to-many).
   Exactly ONE side of the relationship needs it. Without it TypeORM does not
   know where to put the foreign key, and the relation silently does not work.

‼️ 9. Storing money in a `float` or `number` column.
   Floating-point arithmetic drifts. Use `decimal` with an explicit precision,
   or store whole cents as an integer.

‼️ 10. Building query strings with template literals.
   `.where(\`email = '${email}'\`)` is SQL injection. Always use
   `.where('email = :email', { email })`.

‼️ 11. No `take` on a list query.
   Fine with your 12 test rows. Not fine when the table has a million.

‼️ 12. Not closing the DataSource in scripts.
   `await AppDataSource.destroy()` — otherwise the process hangs forever
   instead of exiting, because open sockets keep Node alive.
```

---

## 14. Cheat Sheet

```typescript
// ── SETUP ─────────────────────────────────────────────────────────────────
import 'reflect-metadata';                          // FIRST line, always
const ds = new DataSource({ /* config */ });
await ds.initialize();                              // open the connection
const repo = ds.getRepository(User);                // get a repository
await ds.destroy();                                 // close it when done

// ── ENTITY ────────────────────────────────────────────────────────────────
@Entity('table_name')
@PrimaryGeneratedColumn('uuid')                     // or 'increment'
@Column({ nullable, unique, default, length, type, name, select })
@CreateDateColumn()  @UpdateDateColumn()  @DeleteDateColumn()  @VersionColumn()

// ── RELATIONS ─────────────────────────────────────────────────────────────
@ManyToOne(() => User, (u) => u.posts)              // FK lives HERE
@OneToMany(() => Post, (p) => p.author)             // no column created
@OneToOne(() => Profile, (p) => p.user)  @JoinColumn()     // one side only
@ManyToMany(() => Tag, (t) => t.posts)   @JoinTable()      // one side only

// ── CREATE ────────────────────────────────────────────────────────────────
repo.create({ ... })                                // in memory only, no SQL
await repo.save(entity)                             // INSERT or UPDATE
await repo.insert({ ... })                          // always INSERT

// ── READ ──────────────────────────────────────────────────────────────────
await repo.findOneBy({ id })                        // → Entity | null
await repo.findOneByOrFail({ id })                  // → Entity, or throws
await repo.find({ where, select, relations, order, take, skip })
await repo.findAndCount({ ... })                    // → [rows, total]
await repo.countBy({ ... })                         // → number
await repo.existsBy({ ... })                        // → boolean

// ── UPDATE / DELETE ───────────────────────────────────────────────────────
await repo.save(entity)                             // load → change → save
await repo.update({ id }, { field: value })         // no load, one query
await repo.delete({ id })                           // permanent
await repo.softDelete({ id })                       // sets deletedAt
await repo.restore({ id })                          // undoes softDelete

// ── OPERATORS ─────────────────────────────────────────────────────────────
Like('%x%')  ILike('%x%')  In([...])  Not(x)  IsNull()
MoreThan(n)  MoreThanOrEqual(n)  LessThan(n)  Between(a, b)

// where: { a: 1, b: 2 }         → a = 1 AND b = 2
// where: [{ a: 1 }, { b: 2 }]   → a = 1 OR  b = 2

// ── QUERY BUILDER ─────────────────────────────────────────────────────────
repo.createQueryBuilder('u')
  .leftJoinAndSelect('u.posts', 'p')
  .where('u.active = :a', { a: true })              // ALWAYS parameterised
  .andWhere('u.age > :n', { n: 18 })
  .orderBy('u.createdAt', 'DESC')
  .take(20).skip(0)
  .getMany();                                       // or getOne/getManyAndCount

// ── MIGRATIONS ────────────────────────────────────────────────────────────
// migration:generate src/migrations/Name -d src/data-source.ts
// migration:run     -d src/data-source.ts
// migration:revert  -d src/data-source.ts
```

---

## 15. Where to Go Next

```text
ONCE THE BASICS FEEL COMFORTABLE, the next things worth learning, in order:

  1. TRANSACTIONS — how to make several writes succeed or fail together, so a
     transfer cannot debit one account without crediting the other.
     → NESTJS-DEEP.md §19

  2. INDEXES — why a query is slow, and how one line makes it fast. This is the
     highest-value database skill there is.
     → DATABASE-DESIGN-DEEP.md

  3. CONNECTION POOLING — how many connections your app opens, and why that
     number matters more than you would expect.
     → DATABASE-DESIGN-DEEP.md

  4. QUERY OPTIMISATION — reading EXPLAIN output, and spotting the queries
     worth fixing.
     → SQL-HIGH-DEEP.md

‼️ AND THE MOST USEFUL HABIT: keep `logging: true` on while you develop. Read
   the SQL that TypeORM generates for the queries you write. The ORM's job is
   to hide SQL from you; understanding what it produces is what separates
   someone who uses an ORM from someone who can fix it when it misbehaves.
```

---

## Related Files

- [NESTJS-DEEP.md](NESTJS-DEEP.md) — §16 TypeORM in depth, §19 transactions, §11 validation
- [DATABASE-DESIGN-DEEP.md](../1-high-priority/DATABASE-DESIGN-DEEP.md) — schema design, indexing, normalisation, connection pooling
- [SQL-HIGH-DEEP.md](../1-high-priority/SQL-HIGH-DEEP.md) — the SQL underneath the ORM
- [TYPESCRIPT-DEEP.md](../1-high-priority/TYPESCRIPT-DEEP.md) — classes, decorators, types
