# SQL & PostgreSQL — Beginner to Intermediate Foundation

**Priority: HIGH**

> Covers: tables & data types, CRUD operations, filtering, JOINs, GROUP BY, aggregate functions, ORDER BY, subqueries basics, constraints, and relationships. This file is the prerequisite for SQL-HIGH-DEEP.md.

---

## Table of Contents

1. [What is SQL and PostgreSQL?](#1-what-is-sql-and-postgresql)
2. [Tables, Columns & Data Types](#2-tables-columns--data-types)
3. [CREATE TABLE & Constraints](#3-create-table--constraints)
4. [INSERT — Adding Data](#4-insert--adding-data)
5. [SELECT — Reading Data](#5-select--reading-data)
6. [WHERE — Filtering Rows](#6-where--filtering-rows)
7. [UPDATE & DELETE — Modifying Data](#7-update--delete--modifying-data)
8. [ORDER BY & LIMIT](#8-order-by--limit)
9. [Aggregate Functions & GROUP BY](#9-aggregate-functions--group-by)
10. [JOINs — Combining Tables](#10-joins--combining-tables)
11. [Table Relationships & Foreign Keys](#11-table-relationships--foreign-keys)
12. [Subqueries — Queries Inside Queries](#12-subqueries--queries-inside-queries)
13. [String, Date & Utility Functions](#13-string-date--utility-functions)
14. [CASE — Conditional Logic in SQL](#14-case--conditional-logic-in-sql)
15. [DISTINCT, UNION, INTERSECT, EXCEPT](#15-distinct-union-intersect-except)
16. [NULL Handling](#16-null-handling)
17. [Views — Saved Queries](#17-views--saved-queries)
18. [Basic Indexes](#18-basic-indexes)
19. [Practice Mental Model Summary](#19-practice-mental-model-summary)
20. [Beginner Interview Questions](#20-beginner-interview-questions)

---

## 1. What is SQL and PostgreSQL?

```text
SQL (Structured Query Language):
  A language for talking to databases.
  You write SQL statements to create tables, insert data, query data, update data, delete data.
  
  Think of it like this:
    A database is a spreadsheet on steroids.
    Tables = sheets. Columns = headers. Rows = data entries.
    SQL = the language you use to ask questions about and manipulate the data.

PostgreSQL (Postgres):
  A specific database system — one of many (MySQL, SQLite, SQL Server, etc.).
  PostgreSQL is open-source, powerful, and widely used in production.
  It follows standard SQL closely, plus adds its own features (JSONB, arrays, etc.).

  When you see "psql" — that's the command-line tool to interact with PostgreSQL.

Why learn SQL?
  - Every backend application stores data in a database.
  - SQL is the universal language for relational databases.
  - Interview questions WILL ask about SQL — from junior to senior level.
  - Even with ORMs (like Drizzle, Prisma), you need to understand what SQL they generate.
```

---

## 2. Tables, Columns & Data Types

```text
A table is a structured collection of rows and columns.
  Think of it like a spreadsheet:
  
  users table:
  ┌────┬─────────┬───────────────────┬────────────┐
  │ id │  name   │      email        │ created_at │
  ├────┼─────────┼───────────────────┼────────────┤
  │  1 │ Alice   │ alice@example.com │ 2024-01-15 │
  │  2 │ Bob     │ bob@example.com   │ 2024-02-20 │
  │  3 │ Charlie │ charlie@ex.com    │ 2024-03-10 │
  └────┴─────────┴───────────────────┴────────────┘

  Column = a field (id, name, email, created_at)
  Row = a record (one specific user)
  Each column has a DATA TYPE — it controls what kind of data can go in that column.
```

### Common PostgreSQL data types

```sql
-- Numbers
INTEGER (or INT)     -- whole numbers: 1, 42, -7
BIGINT               -- larger whole numbers (for IDs that might exceed 2 billion)
SERIAL               -- auto-incrementing integer (1, 2, 3, ...) — used for IDs
BIGSERIAL            -- auto-incrementing big integer
NUMERIC(10, 2)       -- exact decimal: 12345678.99 (10 digits total, 2 after decimal)
                     -- Use for money! FLOAT/DOUBLE are approximate and can have rounding errors.
REAL / DOUBLE PRECISION -- floating point numbers (approximate — don't use for money!)

-- Text
VARCHAR(255)         -- variable-length string, max 255 characters
TEXT                 -- unlimited-length string (PostgreSQL treats VARCHAR and TEXT almost the same)
CHAR(10)             -- fixed-length string, padded with spaces (rarely used)

-- Boolean
BOOLEAN              -- true or false

-- Date & Time
DATE                 -- just the date: '2024-01-15'
TIMESTAMP            -- date + time: '2024-01-15 14:30:00'
TIMESTAMPTZ          -- date + time + timezone (ALWAYS use this for real apps!)
                     -- Stores in UTC internally, converts to your timezone on display.
                     -- If you only remember one rule: ALWAYS use TIMESTAMPTZ, never TIMESTAMP.

-- Other
UUID                 -- universally unique identifier: '550e8400-e29b-41d4-a716-446655440000'
JSONB                -- JSON data stored in binary (fast, indexable) — covered in SQL-HIGH-DEEP
```

---

## 3. CREATE TABLE & Constraints

```sql
-- CREATE TABLE: defines a new table with columns and their types

CREATE TABLE users (
  id        SERIAL PRIMARY KEY,      -- auto-incrementing ID, uniquely identifies each row
  name      VARCHAR(100) NOT NULL,   -- required field (cannot be NULL)
  email     VARCHAR(255) NOT NULL UNIQUE, -- required AND must be unique across all rows
  age       INTEGER,                 -- optional field (can be NULL by default)
  is_active BOOLEAN DEFAULT true,    -- default value if not specified on insert
  created_at TIMESTAMPTZ DEFAULT NOW() -- auto-set to current time
);

-- What are constraints? Rules that the database ENFORCES on your data.
-- If you try to violate a constraint, the database REJECTS the operation.
```

### Constraints explained

```text
PRIMARY KEY:
  Uniquely identifies each row. Every table should have one.
  Automatically: NOT NULL + UNIQUE.
  Usually an auto-incrementing integer (SERIAL) or UUID.
  A table can only have ONE primary key.

NOT NULL:
  The column MUST have a value — you cannot insert a row without filling it in.
  Example: a user must have a name.

UNIQUE:
  No two rows can have the same value in this column.
  Example: no two users can have the same email.

DEFAULT:
  If you don't provide a value on insert, use this default.
  Example: is_active defaults to true, created_at defaults to NOW().

CHECK:
  Custom validation rule.
  Example: CHECK (age >= 0) — age cannot be negative.

FOREIGN KEY:
  Links one table to another — covered in section 11 (Relationships).
```

```sql
-- Example with CHECK constraint:
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),  -- price can't be negative
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  category    VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Modify an existing table:
ALTER TABLE users ADD COLUMN phone VARCHAR(20);          -- add a column
ALTER TABLE users DROP COLUMN phone;                     -- remove a column
ALTER TABLE users ALTER COLUMN name SET NOT NULL;        -- add NOT NULL constraint
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email); -- add UNIQUE constraint

-- Delete a table (DANGER — deletes all data permanently!):
DROP TABLE users;

-- Delete a table only if it exists (avoids error):
DROP TABLE IF EXISTS users;
```

---

## 4. INSERT — Adding Data

```sql
-- INSERT: add new rows to a table

-- Insert one row (specify columns):
INSERT INTO users (name, email, age)
VALUES ('Alice', 'alice@example.com', 28);
-- id is auto-generated (SERIAL), created_at uses DEFAULT (NOW())

-- Insert one row and get back the generated ID:
INSERT INTO users (name, email)
VALUES ('Bob', 'bob@example.com')
RETURNING id;
-- RETURNING is PostgreSQL-specific — very useful!
-- Returns: id = 2 (or whatever the auto-generated value is)

-- RETURNING can return any columns:
INSERT INTO users (name, email)
VALUES ('Charlie', 'charlie@example.com')
RETURNING id, name, created_at;

-- Insert multiple rows at once:
INSERT INTO users (name, email, age) VALUES
  ('David', 'david@example.com', 30),
  ('Eve', 'eve@example.com', 25),
  ('Frank', 'frank@example.com', 35);
-- This is ONE statement — much faster than 3 separate INSERTs

-- Insert with DEFAULT values explicitly:
INSERT INTO users (name, email, is_active)
VALUES ('Grace', 'grace@example.com', DEFAULT);
-- is_active will be true (the default)
```

---

## 5. SELECT — Reading Data

```sql
-- SELECT: the most important SQL statement — retrieves data from tables

-- Select ALL columns, ALL rows:
SELECT * FROM users;
-- * means "all columns" — convenient but avoid in production code
-- (if you add a column later, SELECT * returns it too — may break your app)

-- Select specific columns:
SELECT name, email FROM users;

-- Rename columns in the output (alias):
SELECT name AS user_name, email AS user_email FROM users;
-- The table isn't changed — just the output column names

-- Select with a calculated column:
SELECT name, age, age * 12 AS age_in_months FROM users;

-- Select a constant value for every row:
SELECT name, 'active' AS status FROM users;
```

```text
Execution order of a SELECT query (this is IMPORTANT to understand!):

  The order you WRITE SQL:    The order the database EXECUTES it:
  ┌───────────────────┐       ┌───────────────────────────────────┐
  │ 1. SELECT          │       │ 1. FROM     — pick the table(s)  │
  │ 2. FROM             │       │ 2. JOIN     — combine tables     │
  │ 3. WHERE            │       │ 3. WHERE    — filter rows        │
  │ 4. GROUP BY         │       │ 4. GROUP BY — group rows         │
  │ 5. HAVING           │       │ 5. HAVING   — filter groups      │
  │ 6. ORDER BY         │       │ 6. SELECT   — pick columns       │
  │ 7. LIMIT            │       │ 7. ORDER BY — sort results       │
  └───────────────────┘       │ 8. LIMIT    — cut off results    │
                               └───────────────────────────────────┘

  Why does this matter?
  - You CAN'T use a column alias from SELECT in WHERE (because WHERE runs first!)
  - You CAN use a column alias in ORDER BY (because ORDER BY runs after SELECT)
  - You CAN'T use aggregate functions in WHERE (because WHERE runs before GROUP BY)
    → use HAVING instead (it runs after GROUP BY)
```

---

## 6. WHERE — Filtering Rows

```sql
-- WHERE: filter which rows are returned

-- Equality:
SELECT * FROM users WHERE name = 'Alice';

-- Comparison:
SELECT * FROM users WHERE age > 25;
SELECT * FROM users WHERE age >= 25;
SELECT * FROM users WHERE age < 30;
SELECT * FROM users WHERE age != 25;  -- or: age <> 25

-- Multiple conditions:
SELECT * FROM users WHERE age > 25 AND is_active = true;
SELECT * FROM users WHERE age < 20 OR age > 60;
SELECT * FROM users WHERE NOT is_active;  -- same as: is_active = false

-- BETWEEN (inclusive on both ends):
SELECT * FROM users WHERE age BETWEEN 25 AND 35;
-- Same as: WHERE age >= 25 AND age <= 35

-- IN (match any value in a list):
SELECT * FROM users WHERE age IN (25, 30, 35);
-- Same as: WHERE age = 25 OR age = 30 OR age = 35

-- NOT IN:
SELECT * FROM users WHERE age NOT IN (25, 30, 35);

-- LIKE (pattern matching on strings):
SELECT * FROM users WHERE name LIKE 'A%';     -- starts with 'A'
SELECT * FROM users WHERE name LIKE '%son';    -- ends with 'son'
SELECT * FROM users WHERE name LIKE '%ali%';   -- contains 'ali' (case-sensitive!)
SELECT * FROM users WHERE name ILIKE '%ali%';  -- contains 'ali' (case-INsensitive, PostgreSQL only)
-- % = any number of characters
-- _ = exactly one character
-- LIKE 'A_e' matches 'Ace', 'Abe', but not 'Alice'

-- NULL checks (IMPORTANT: you CANNOT use = or != with NULL!):
SELECT * FROM users WHERE age IS NULL;       -- correct
SELECT * FROM users WHERE age IS NOT NULL;   -- correct
-- SELECT * FROM users WHERE age = NULL;     -- WRONG! Always returns no rows.
-- NULL is not a value — it's the ABSENCE of a value. You can't compare it with =.

-- Date filtering:
SELECT * FROM users WHERE created_at > '2024-01-01';
SELECT * FROM users WHERE created_at BETWEEN '2024-01-01' AND '2024-06-30';
```

---

## 7. UPDATE & DELETE — Modifying Data

```sql
-- UPDATE: modify existing rows

-- Update one column for one row:
UPDATE users SET name = 'Alicia' WHERE id = 1;
-- ALWAYS include a WHERE clause! Without it, you update EVERY row in the table.

-- Update multiple columns:
UPDATE users SET name = 'Alicia', age = 29 WHERE id = 1;

-- Update based on a condition:
UPDATE users SET is_active = false WHERE last_login < '2023-01-01';

-- Update and get back the changed rows:
UPDATE users SET is_active = false WHERE last_login < '2023-01-01'
RETURNING id, name, is_active;

-- Update with a calculated value:
UPDATE products SET price = price * 1.1; -- increase all prices by 10%
-- (no WHERE = affects ALL rows — be very careful!)
```

```sql
-- DELETE: remove rows from a table

-- Delete specific rows:
DELETE FROM users WHERE id = 5;

-- Delete based on a condition:
DELETE FROM users WHERE is_active = false AND created_at < '2023-01-01';

-- Delete and get back what was deleted:
DELETE FROM users WHERE id = 5 RETURNING *;

-- Delete ALL rows (but keep the table structure):
DELETE FROM users;
-- DANGER: removes every row! Use TRUNCATE instead for better performance on large tables.

-- TRUNCATE: faster way to delete all rows (resets auto-increment too)
TRUNCATE TABLE users;

-- CRITICAL SAFETY RULE:
-- ALWAYS write the WHERE clause FIRST when writing UPDATE or DELETE.
-- Or better: write the SELECT first to preview which rows will be affected.

-- Step 1: preview what will be changed
SELECT * FROM users WHERE last_login < '2023-01-01';
-- Step 2: if the results look right, change SELECT to DELETE/UPDATE
DELETE FROM users WHERE last_login < '2023-01-01';
```

---

## 8. ORDER BY & LIMIT

```sql
-- ORDER BY: sort the results

-- Sort ascending (default — smallest first):
SELECT * FROM users ORDER BY name;         -- alphabetical A-Z
SELECT * FROM users ORDER BY age ASC;      -- youngest first (ASC is optional, it's the default)

-- Sort descending (largest first):
SELECT * FROM users ORDER BY age DESC;     -- oldest first
SELECT * FROM users ORDER BY created_at DESC; -- newest first (most common for lists)

-- Sort by multiple columns:
SELECT * FROM users ORDER BY age DESC, name ASC;
-- First sort by age (oldest first), then within same age, alphabetical by name

-- LIMIT: return only the first N rows
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
-- The 10 most recently created users

-- OFFSET: skip the first N rows (used for pagination)
SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 20;
-- Skip the first 20, then return the next 10 (page 3 if page size = 10)

-- LIMIT 1: useful when you want exactly one result
SELECT * FROM users WHERE email = 'alice@example.com' LIMIT 1;

-- Practical pagination example:
-- Page 1: LIMIT 20 OFFSET 0   (rows 1-20)
-- Page 2: LIMIT 20 OFFSET 20  (rows 21-40)
-- Page 3: LIMIT 20 OFFSET 40  (rows 41-60)
-- Formula: OFFSET = (page_number - 1) * page_size
-- Note: OFFSET pagination gets slow on large tables — SQL-HIGH-DEEP covers keyset pagination.
```

---

## 9. Aggregate Functions & GROUP BY

### Aggregate functions

```sql
-- Aggregate functions: take multiple rows and return ONE value

-- COUNT: how many rows?
SELECT COUNT(*) FROM users;                    -- total number of users
SELECT COUNT(*) FROM users WHERE is_active = true; -- active users
SELECT COUNT(age) FROM users;                  -- rows where age is NOT NULL
-- COUNT(*) counts ALL rows, COUNT(column) counts only non-NULL values!

-- SUM: add up values
SELECT SUM(price) FROM products;               -- total price of all products

-- AVG: average value
SELECT AVG(age) FROM users;                    -- average age

-- MIN / MAX: smallest / largest value
SELECT MIN(price) FROM products;               -- cheapest product
SELECT MAX(created_at) FROM users;             -- most recently created user

-- You can combine them:
SELECT
  COUNT(*) AS total_users,
  AVG(age) AS avg_age,
  MIN(age) AS youngest,
  MAX(age) AS oldest
FROM users;
```

### GROUP BY

```sql
-- GROUP BY: split rows into groups, then apply aggregate functions to each group

-- How many users per age?
SELECT age, COUNT(*) AS user_count
FROM users
GROUP BY age;
-- Result:
-- age | user_count
-- 25  | 3
-- 28  | 5
-- 30  | 2

-- Total spending per user:
SELECT user_id, SUM(amount) AS total_spent
FROM orders
GROUP BY user_id;

-- RULE: every column in SELECT must either:
--   1. Be in the GROUP BY clause, OR
--   2. Be inside an aggregate function (COUNT, SUM, AVG, etc.)
-- This is WRONG:
-- SELECT name, age, COUNT(*) FROM users GROUP BY age;
-- ❌ "name" is not in GROUP BY and not aggregated — which name should it show?

-- Group by multiple columns:
SELECT department, job_title, AVG(salary) AS avg_salary
FROM employees
GROUP BY department, job_title;
```

### HAVING

```sql
-- HAVING: filter AFTER grouping (WHERE filters BEFORE grouping)

-- Users who have placed more than 5 orders:
SELECT user_id, COUNT(*) AS order_count
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5;

-- Departments with average salary above 80k:
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > 80000;

-- WHERE vs HAVING — when to use which:
-- WHERE:  filters individual ROWS before grouping.   Cannot use aggregate functions.
-- HAVING: filters GROUPS after grouping.              Can use aggregate functions.

-- Example showing both:
SELECT department, AVG(salary) AS avg_salary
FROM employees
WHERE is_active = true              -- Step 1: only look at active employees
GROUP BY department                 -- Step 2: group by department
HAVING AVG(salary) > 80000         -- Step 3: only keep departments with high avg salary
ORDER BY avg_salary DESC;           -- Step 4: sort results
```

---

## 10. JOINs — Combining Tables

```text
JOINs combine rows from two (or more) tables based on a related column.

  Why do we need JOINs?
  Instead of putting everything in one giant table (which causes data duplication),
  we split data into separate tables and link them with IDs.
  
  Example:
    users table: id, name, email
    orders table: id, user_id, product, amount
    
    user_id in orders points to id in users — this is a FOREIGN KEY.
    To get "which user placed which order", you JOIN the two tables.
```

### INNER JOIN

```sql
-- INNER JOIN: only returns rows that have matches in BOTH tables

SELECT users.name, orders.product, orders.amount
FROM users
INNER JOIN orders ON orders.user_id = users.id;
-- Only users who HAVE orders will appear.
-- Users with no orders? Gone. Orders with no valid user_id? Gone.

-- Using aliases (shorter names):
SELECT u.name, o.product, o.amount
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
-- "u" is an alias for "users", "o" for "orders"

-- With a filter:
SELECT u.name, o.product, o.amount
FROM users u
INNER JOIN orders o ON o.user_id = u.id
WHERE o.amount > 100;
```

```text
Visualize INNER JOIN:

  users:                 orders:
  id=1 Alice             order_id=10 user_id=1 $50
  id=2 Bob               order_id=11 user_id=1 $30
  id=3 Charlie           order_id=12 user_id=2 $75
                          order_id=13 user_id=99 $20  ← no user with id=99
  
  INNER JOIN result:
  Alice  | $50      ← user_id=1 matched
  Alice  | $30      ← user_id=1 matched again (Alice has 2 orders)
  Bob    | $75      ← user_id=2 matched
  
  Charlie is MISSING (no orders).
  order_id=13 is MISSING (user_id=99 doesn't exist).
```

### LEFT JOIN

```sql
-- LEFT JOIN: returns ALL rows from the LEFT table, even if no match in the right table
-- Missing values from the right table are filled with NULL

SELECT u.name, o.product, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

```text
Visualize LEFT JOIN:

  LEFT table = users (ALL users appear)
  RIGHT table = orders (only matching ones)

  Result:
  Alice   | $50      ← matched
  Alice   | $30      ← matched
  Bob     | $75      ← matched
  Charlie | NULL     ← no orders, but Charlie still appears! (LEFT JOIN keeps him)

  This is the most commonly used JOIN in real applications.
  Use it when you want "all items from the main table, with optional related data."
```

```sql
-- Find users who have NO orders:
SELECT u.name
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;
-- After LEFT JOIN, users with no orders have NULL in the orders columns.
-- Filtering on o.id IS NULL gives us only those users.

-- Count orders per user (including users with zero orders):
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;
-- Use COUNT(o.id) not COUNT(*) — COUNT(*) counts the NULL row as 1!
-- COUNT(column) only counts non-NULL values.
```

### RIGHT JOIN and FULL OUTER JOIN

```sql
-- RIGHT JOIN: opposite of LEFT JOIN — all rows from the RIGHT table
-- Rarely used — you can always rewrite it as a LEFT JOIN by swapping table order

-- These two are equivalent:
SELECT * FROM users u RIGHT JOIN orders o ON o.user_id = u.id;
SELECT * FROM orders o LEFT JOIN users u ON u.id = o.user_id;
-- Just swap the tables and use LEFT JOIN — easier to read.

-- FULL OUTER JOIN: all rows from BOTH tables, NULLs where no match
SELECT u.name, o.product
FROM users u
FULL OUTER JOIN orders o ON o.user_id = u.id;
-- Returns: matched rows + unmatched users (NULL product) + unmatched orders (NULL name)
-- Rarely used in practice.
```

### CROSS JOIN

```sql
-- CROSS JOIN: every row from table A combined with every row from table B
-- If A has 3 rows and B has 4 rows → result has 3 × 4 = 12 rows

SELECT u.name, p.product_name
FROM users u
CROSS JOIN products p;
-- Every user paired with every product — "cartesian product"
-- Rarely used, but useful for: generating combinations, test data, calendars

-- Example: generate all date + user combinations for a report
SELECT d.date, u.name
FROM generate_series('2024-01-01', '2024-01-31', '1 day'::interval) AS d(date)
CROSS JOIN users u;
```

### Self JOIN

```sql
-- Self JOIN: a table joined to itself
-- Use case: when rows in the same table reference each other

-- Employees with managers (manager_id points to another employee's id):
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100),
  manager_id INTEGER REFERENCES employees(id)
);

-- Get each employee with their manager's name:
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;
-- We join employees to itself: "e" = the employee, "m" = their manager
-- LEFT JOIN because the CEO has no manager (manager_id is NULL)
```

### Joining multiple tables

```sql
-- You can chain JOINs to combine 3+ tables:

SELECT
  u.name AS user_name,
  o.id AS order_id,
  p.name AS product_name,
  oi.quantity,
  oi.price
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.created_at > '2024-01-01';

-- Read the JOINs step by step:
-- 1. Start with users
-- 2. JOIN orders (find each user's orders)
-- 3. JOIN order_items (find items in each order)
-- 4. JOIN products (find the product name for each item)
```

---

## 11. Table Relationships & Foreign Keys

```text
There are three types of relationships between tables:

1. One-to-Many (most common):
   One user has many orders. One order belongs to one user.
   The "many" side has a foreign key pointing to the "one" side.
   
   users: id, name
   orders: id, user_id (FK → users.id), product, amount

2. One-to-One:
   One user has one profile. One profile belongs to one user.
   
   users: id, name
   profiles: id, user_id (FK → users.id, UNIQUE), bio, avatar_url
   The UNIQUE constraint on user_id ensures one profile per user.

3. Many-to-Many:
   One student can enroll in many courses. One course has many students.
   Requires a "junction table" (also called "join table" or "bridge table").
   
   students: id, name
   courses: id, title
   enrollments: student_id (FK → students.id), course_id (FK → courses.id)
   The junction table has two foreign keys — one to each side.
```

```sql
-- One-to-Many example:
CREATE TABLE users (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id),  -- FOREIGN KEY
  product   VARCHAR(100) NOT NULL,
  amount    NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- REFERENCES users(id) = foreign key constraint
-- The database will REJECT any INSERT into orders where user_id doesn't exist in users.

-- Many-to-Many example:
CREATE TABLE students (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
  id    SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL
);

CREATE TABLE enrollments (
  student_id INTEGER REFERENCES students(id),
  course_id  INTEGER REFERENCES courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, course_id)  -- composite primary key (prevents duplicate enrollments)
);

-- Query: which courses is student "Alice" enrolled in?
SELECT c.title
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
WHERE s.name = 'Alice';
```

### ON DELETE behavior

```sql
-- What happens to orders when you delete a user?
-- By default: ERROR — can't delete a user who has orders (FK constraint)

-- Options:
CREATE TABLE orders (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  -- CASCADE: delete the user → automatically delete all their orders too
  
  -- Other options:
  -- ON DELETE SET NULL    → set user_id to NULL (order stays, but unlinked)
  -- ON DELETE RESTRICT    → block the delete (default behavior)
  -- ON DELETE SET DEFAULT → set user_id to its DEFAULT value
);
```

---

## 12. Subqueries — Queries Inside Queries

```sql
-- A subquery is a SELECT inside another SQL statement.
-- It runs first, and its result is used by the outer query.

-- Subquery in WHERE (most common):
-- Find users who have placed an order:
SELECT name FROM users
WHERE id IN (SELECT user_id FROM orders);
-- Inner query: get all user_ids from orders → (1, 2, 5, 8)
-- Outer query: find users where id is in that list

-- Subquery with comparison:
-- Find products more expensive than the average price:
SELECT name, price FROM products
WHERE price > (SELECT AVG(price) FROM products);
-- Inner query returns ONE value (the average), outer query uses it

-- Subquery in SELECT (scalar subquery):
-- For each user, count their orders:
SELECT
  u.name,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
FROM users u;
-- This runs the inner query ONCE per user — can be slow for many users!
-- Better approach: use a JOIN + GROUP BY (covered in JOINs section)

-- Subquery in FROM (derived table):
-- Find the top spender:
SELECT user_name, total_spent
FROM (
  SELECT u.name AS user_name, SUM(o.amount) AS total_spent
  FROM users u
  JOIN orders o ON o.user_id = u.id
  GROUP BY u.id, u.name
) AS user_totals
ORDER BY total_spent DESC
LIMIT 1;
-- The inner query creates a "virtual table" (user_totals), the outer query uses it.

-- EXISTS: check if a subquery returns ANY rows (true/false)
-- Find users who have at least one order:
SELECT u.name
FROM users u
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.user_id = u.id
);
-- EXISTS is often faster than IN because it stops as soon as it finds one match.
```

---

## 13. String, Date & Utility Functions

### String functions

```sql
-- UPPER / LOWER: change case
SELECT UPPER('hello');    -- 'HELLO'
SELECT LOWER('HELLO');    -- 'hello'

-- LENGTH: count characters
SELECT LENGTH('hello');   -- 5

-- CONCAT: combine strings
SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM users;
-- Or use || operator (PostgreSQL):
SELECT first_name || ' ' || last_name AS full_name FROM users;

-- TRIM: remove whitespace from start/end
SELECT TRIM('  hello  ');       -- 'hello'
SELECT LTRIM('  hello');        -- 'hello' (left trim)
SELECT RTRIM('hello  ');        -- 'hello' (right trim)

-- SUBSTRING: extract part of a string
SELECT SUBSTRING('Hello World' FROM 1 FOR 5);  -- 'Hello'

-- REPLACE: replace text within a string
SELECT REPLACE('Hello World', 'World', 'SQL');  -- 'Hello SQL'

-- POSITION: find where a substring starts
SELECT POSITION('World' IN 'Hello World');  -- 7

-- LEFT / RIGHT: take characters from start/end
SELECT LEFT('Hello', 3);   -- 'Hel'
SELECT RIGHT('Hello', 3);  -- 'llo'
```

### Date functions

```sql
-- NOW(): current date and time (with timezone)
SELECT NOW();  -- 2024-06-15 14:30:00+00

-- CURRENT_DATE: just today's date
SELECT CURRENT_DATE;  -- 2024-06-15

-- Extract parts from a date:
SELECT EXTRACT(YEAR FROM created_at) AS year FROM users;
SELECT EXTRACT(MONTH FROM created_at) AS month FROM users;
SELECT EXTRACT(DOW FROM created_at) AS day_of_week FROM users;  -- 0=Sunday, 6=Saturday

-- Date arithmetic with INTERVAL:
SELECT NOW() - INTERVAL '7 days';    -- 7 days ago
SELECT NOW() + INTERVAL '1 month';   -- 1 month from now
SELECT NOW() - INTERVAL '2 hours';   -- 2 hours ago

-- Find users created in the last 30 days:
SELECT * FROM users WHERE created_at > NOW() - INTERVAL '30 days';

-- DATE_TRUNC: truncate to a precision (useful for grouping by day/month/year)
SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)
FROM users
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
-- Groups users by the month they were created

-- AGE: difference between two dates
SELECT AGE(NOW(), created_at) FROM users;  -- e.g., '1 year 3 mons 5 days'

-- TO_CHAR: format a date as a string
SELECT TO_CHAR(created_at, 'YYYY-MM-DD') FROM users;        -- '2024-01-15'
SELECT TO_CHAR(created_at, 'Mon DD, YYYY') FROM users;      -- 'Jan 15, 2024'
SELECT TO_CHAR(created_at, 'HH24:MI:SS') FROM users;        -- '14:30:00'
```

### Utility functions

```sql
-- COALESCE: return the first non-NULL value (extremely useful!)
SELECT COALESCE(nickname, name, 'Unknown') AS display_name FROM users;
-- If nickname is NULL, use name. If name is also NULL, use 'Unknown'.
-- Common use: provide a default for NULL values.

SELECT u.name, COALESCE(SUM(o.amount), 0) AS total_spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;
-- Without COALESCE: users with no orders show NULL for total_spent
-- With COALESCE: users with no orders show 0

-- NULLIF: return NULL if two values are equal (prevents division by zero)
SELECT total / NULLIF(count, 0) AS average FROM stats;
-- If count = 0, NULLIF returns NULL → division gives NULL instead of error

-- CAST: convert between types
SELECT CAST('42' AS INTEGER);          -- string to number
SELECT CAST(price AS TEXT);            -- number to string
-- Shorthand in PostgreSQL:
SELECT '42'::INTEGER;
SELECT price::TEXT;

-- GREATEST / LEAST: return the largest / smallest from a list
SELECT GREATEST(10, 20, 5);  -- 20
SELECT LEAST(10, 20, 5);     -- 5
```

---

## 14. CASE — Conditional Logic in SQL

```sql
-- CASE: like if/else in SQL — transform values conditionally

-- Simple CASE: compare a column to specific values
SELECT
  name,
  status,
  CASE status
    WHEN 'active' THEN 'Currently Active'
    WHEN 'inactive' THEN 'Deactivated'
    WHEN 'pending' THEN 'Awaiting Approval'
    ELSE 'Unknown'
  END AS status_label
FROM users;

-- Searched CASE: use any condition (more flexible)
SELECT
  name,
  age,
  CASE
    WHEN age < 18 THEN 'Minor'
    WHEN age BETWEEN 18 AND 64 THEN 'Adult'
    WHEN age >= 65 THEN 'Senior'
    ELSE 'Unknown'
  END AS age_group
FROM users;

-- CASE in ORDER BY (custom sort order):
SELECT * FROM tasks
ORDER BY
  CASE priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
  END;

-- CASE in aggregate (conditional counting):
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
  COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive_count
FROM users;
-- CASE returns NULL when no condition matches (and ELSE is missing)
-- COUNT ignores NULLs — so this only counts matching rows

-- Shorter: use FILTER (PostgreSQL-specific, cleaner syntax):
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_count
FROM users;
```

---

## 15. DISTINCT, UNION, INTERSECT, EXCEPT

### DISTINCT

```sql
-- DISTINCT: remove duplicate rows from results

-- Get unique cities:
SELECT DISTINCT city FROM users;

-- Distinct on multiple columns (unique combinations):
SELECT DISTINCT city, country FROM users;
-- Returns each unique (city, country) pair

-- Count distinct values:
SELECT COUNT(DISTINCT city) FROM users;  -- how many unique cities
```

### Set operations

```sql
-- UNION: combine results of two queries (removes duplicates)
SELECT name FROM employees
UNION
SELECT name FROM contractors;
-- Returns all unique names from both tables

-- UNION ALL: same but KEEPS duplicates (faster — no dedup step)
SELECT name FROM employees
UNION ALL
SELECT name FROM contractors;
-- If "Alice" is in both tables, she appears twice

-- INTERSECT: rows that appear in BOTH queries
SELECT email FROM newsletter_subscribers
INTERSECT
SELECT email FROM customers;
-- People who are both subscribers AND customers

-- EXCEPT: rows in the first query but NOT in the second
SELECT email FROM newsletter_subscribers
EXCEPT
SELECT email FROM unsubscribed;
-- Subscribers who have NOT unsubscribed

-- Rules for set operations:
-- 1. Both queries must have the SAME number of columns
-- 2. Corresponding columns must have compatible types
-- 3. Column names come from the FIRST query
```

---

## 16. NULL Handling

```text
NULL is one of the most misunderstood concepts in SQL.

  NULL means "unknown" or "no value" — NOT zero, NOT empty string, NOT false.

  Key rules:
  1. NULL = NULL  → NULL (not true!)
     You CANNOT compare NULL with = or !=
     Use IS NULL and IS NOT NULL instead.

  2. Any arithmetic with NULL → NULL
     5 + NULL = NULL
     NULL * 10 = NULL
     
  3. Any comparison with NULL → NULL (which is treated as false in WHERE)
     NULL > 5  → NULL (filtered out by WHERE)
     NULL != 5 → NULL (filtered out by WHERE)

  4. Aggregate functions IGNORE NULLs (except COUNT(*))
     AVG(column) ignores NULL rows
     COUNT(column) counts non-NULL only
     COUNT(*) counts ALL rows including NULL

  5. NULL in boolean logic:
     true AND NULL  → NULL
     false AND NULL → false
     true OR NULL   → true
     false OR NULL  → NULL
```

```sql
-- Common NULL pitfalls and solutions:

-- WRONG: trying to find rows where column is NULL
SELECT * FROM users WHERE age = NULL;       -- returns nothing!
-- CORRECT:
SELECT * FROM users WHERE age IS NULL;

-- WRONG: NOT IN with NULLs in the subquery
SELECT * FROM users WHERE id NOT IN (1, 2, NULL);
-- Returns NOTHING — because "id != NULL" is unknown for every row!
-- CORRECT: use NOT EXISTS or filter out NULLs
SELECT * FROM users u
WHERE NOT EXISTS (SELECT 1 FROM blocked WHERE blocked.user_id = u.id);

-- Handling NULL in ORDER BY:
SELECT * FROM users ORDER BY age NULLS FIRST;   -- NULLs at the top
SELECT * FROM users ORDER BY age NULLS LAST;    -- NULLs at the bottom
-- Default: NULLS LAST for ASC, NULLS FIRST for DESC

-- IS DISTINCT FROM: NULL-safe comparison
-- Regular:  NULL = NULL   → NULL (treated as false)
-- Distinct: NULL IS NOT DISTINCT FROM NULL → true
SELECT * FROM users WHERE age IS DISTINCT FROM 25;
-- Returns rows where age is not 25 AND rows where age is NULL
-- (unlike age != 25 which would exclude NULLs)
```

---

## 17. Views — Saved Queries

```sql
-- A VIEW is a saved SELECT query that you can use like a table.
-- It doesn't store data — it runs the query every time you SELECT from it.

-- Create a view:
CREATE VIEW active_users AS
  SELECT id, name, email
  FROM users
  WHERE is_active = true AND deleted_at IS NULL;

-- Use it like a table:
SELECT * FROM active_users;
SELECT name FROM active_users WHERE name LIKE 'A%';

-- Why use views?
-- 1. Simplify complex queries (write once, use everywhere)
-- 2. Security: give users access to a view instead of the full table
-- 3. Abstraction: hide complex JOINs behind a simple name

-- A more practical view:
CREATE VIEW user_order_summary AS
  SELECT
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.amount), 0) AS total_spent,
    MAX(o.created_at) AS last_order_date
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id, u.name, u.email;

-- Now this complex query is just:
SELECT * FROM user_order_summary WHERE total_spent > 1000;

-- Update or replace a view:
CREATE OR REPLACE VIEW active_users AS
  SELECT id, name, email, created_at
  FROM users
  WHERE is_active = true;

-- Delete a view:
DROP VIEW active_users;
DROP VIEW IF EXISTS active_users;

-- MATERIALIZED VIEW: stores the result (like a cache) — covered in SQL-HIGH-DEEP
```

---

## 18. Basic Indexes

```text
An index is a shortcut that helps the database find rows faster.

  Without an index:
    SELECT * FROM users WHERE email = 'alice@example.com';
    → Database reads EVERY row in the table to find the match (Seq Scan).
    → If the table has 1 million rows, it checks all 1 million.

  With an index on email:
    → Database looks up the email in the index and jumps directly to the row.
    → Like looking up a word in a book's index vs reading every page.

  Trade-off:
    ✓ Faster reads (SELECT, WHERE, JOIN, ORDER BY)
    ✗ Slower writes (INSERT, UPDATE, DELETE must also update the index)
    ✗ Extra disk space

  When to add an index:
    - Columns used in WHERE clauses frequently
    - Columns used in JOIN conditions (foreign keys!)
    - Columns used in ORDER BY
    - Columns with high cardinality (many unique values — like email)
    
  When NOT to index:
    - Small tables (< 1000 rows) — Seq Scan is fast enough
    - Columns with low cardinality (like boolean is_active — only true/false)
    - Tables with heavy writes and few reads
```

```sql
-- Create an index:
CREATE INDEX idx_users_email ON users(email);
-- "idx_users_email" is just a name — convention: idx_tablename_columnname

-- Create a unique index (also enforces uniqueness):
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Index on a foreign key (you should ALWAYS index foreign keys!):
CREATE INDEX idx_orders_user_id ON orders(user_id);
-- Without this: every JOIN on user_id requires a full table scan of orders

-- Index on multiple columns (composite index):
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Helps: WHERE user_id = 1 AND status = 'pending'
-- Also helps: WHERE user_id = 1 (leftmost column)
-- Does NOT help: WHERE status = 'pending' alone (not the leftmost column)

-- Check if your query uses an index:
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';
-- Look for "Index Scan" (good) vs "Seq Scan" (no index used)
-- Deep dive on EXPLAIN: see SQL-HIGH-DEEP.md

-- Remove an index:
DROP INDEX idx_users_email;
```

---

## 19. Practice Mental Model Summary

```text
Think of SQL operations as a pipeline. Data flows through each step:

  FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT

  Each step transforms the data:
  
  ┌─────────────────────────────────────────────────────────────┐
  │ FROM users u                                                │
  │   → start with all rows from the users table                │
  │                                                             │
  │ JOIN orders o ON o.user_id = u.id                           │
  │   → combine with matching rows from orders                  │
  │                                                             │
  │ WHERE o.created_at > '2024-01-01'                           │
  │   → filter out rows that don't match                        │
  │                                                             │
  │ GROUP BY u.id, u.name                                       │
  │   → collapse rows into groups (one group per user)          │
  │                                                             │
  │ HAVING COUNT(o.id) > 5                                      │
  │   → filter out groups that don't match                      │
  │                                                             │
  │ SELECT u.name, COUNT(o.id) AS order_count                   │
  │   → pick which columns to show                              │
  │                                                             │
  │ ORDER BY order_count DESC                                   │
  │   → sort the results                                        │
  │                                                             │
  │ LIMIT 10                                                    │
  │   → take only the first 10 rows                             │
  └─────────────────────────────────────────────────────────────┘

  Cheat sheet:
    Need data from one table?         → SELECT ... FROM ... WHERE
    Need data from two tables?        → JOIN
    Need to count/sum/average?        → Aggregate function + GROUP BY
    Need to filter on aggregates?     → HAVING (not WHERE)
    Need to sort?                     → ORDER BY
    Need to limit results?            → LIMIT
    Need conditional output?          → CASE
    Need a default for NULL?          → COALESCE
    Need to check existence?          → EXISTS (faster than IN for large sets)
    Query is complex and hard to read? → Break into CTEs (WITH clause) → SQL-HIGH-DEEP
    Query is slow?                    → EXPLAIN ANALYZE → SQL-HIGH-DEEP
```

---

## 20. Beginner Interview Questions

### "What is a primary key?"

> A primary key uniquely identifies each row in a table. It must be unique and cannot be NULL. Every table should have one. Usually an auto-incrementing integer (SERIAL) or UUID. A table can only have one primary key, but it can span multiple columns (composite primary key).

### "What is a foreign key?"

> A foreign key is a column that references the primary key of another table. It creates a relationship between tables. The database enforces referential integrity — you can't insert a foreign key value that doesn't exist in the referenced table, and you can't delete a referenced row (unless you set ON DELETE CASCADE).

### "What is the difference between WHERE and HAVING?"

> WHERE filters individual rows BEFORE grouping. HAVING filters groups AFTER grouping. WHERE cannot use aggregate functions (COUNT, SUM, etc.). HAVING can. You need GROUP BY to use HAVING.

### "What is the difference between INNER JOIN and LEFT JOIN?"

> INNER JOIN returns only rows that match in both tables. LEFT JOIN returns all rows from the left table, with NULLs for the right table when there's no match. Use LEFT JOIN when you want all records from the main table even if they have no related data.

### "What is NULL in SQL?"

> NULL means "unknown" or "no value." It is not zero, not an empty string, not false. You cannot compare NULL with = or != — use IS NULL and IS NOT NULL. Any arithmetic or comparison with NULL produces NULL. Aggregate functions ignore NULL values (except COUNT(*)).

### "What is normalization?"

> Normalization is the process of organizing tables to reduce data redundancy and improve integrity. 1NF: atomic values, unique rows. 2NF: no partial dependencies on composite keys. 3NF: no transitive dependencies (non-key columns depend only on the key). In practice, aim for 3NF and denormalize only when you need read performance.

### "How do you find duplicate rows?"

```sql
-- Find duplicate emails:
SELECT email, COUNT(*) AS count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Find and see the duplicate rows:
SELECT * FROM users
WHERE email IN (
  SELECT email FROM users
  GROUP BY email
  HAVING COUNT(*) > 1
)
ORDER BY email;
```

### "How do you get the second highest salary?"

```sql
-- Method 1: LIMIT + OFFSET
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- Method 2: subquery
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Method 3: for Nth highest, use DENSE_RANK (see SQL-HIGH-DEEP for window functions)
```

### "What is the difference between DELETE and TRUNCATE?"

> DELETE removes rows one by one, can have a WHERE clause, fires triggers, and can be rolled back. TRUNCATE removes all rows at once — faster, resets auto-increment, no WHERE clause, can be rolled back in PostgreSQL. Use DELETE for selective removal, TRUNCATE for clearing an entire table.

---

## What to Study Next

```text
Once you're comfortable with everything in this file, move on to:

  SQL-HIGH-DEEP.md — covers:
    ✦ EXPLAIN ANALYZE (understand why queries are slow)
    ✦ Index types & strategy (B-tree, GIN, partial, covering)
    ✦ Window functions (ROW_NUMBER, RANK, LAG/LEAD, running totals)
    ✦ CTEs (WITH clause — break complex queries into readable steps)
    ✦ Transactions & locking (ACID, isolation levels, deadlocks)
    ✦ VACUUM & table bloat (PostgreSQL internals)
    ✦ Advanced patterns (upsert, pagination, JSONB)
```
