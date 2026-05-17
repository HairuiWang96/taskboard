# COBOL — Senior Developer Deep Reference

> Covers program structure, data division, file handling, arithmetic, tables, and modern COBOL patterns.

---

## Table of Contents

1. [Program Structure — The Four Divisions](#1-program-structure--the-four-divisions)
2. [Data Division — Working-Storage & File Section](#2-data-division--working-storage--file-section)
3. [Procedure Division — Control Flow](#3-procedure-division--control-flow)
4. [File Handling](#4-file-handling)
5. [Tables (Arrays) & SEARCH](#5-tables-arrays--search)
6. [String Handling](#6-string-handling)
7. [Modern COBOL & Mainframe Context](#7-modern-cobol--mainframe-context)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Program Structure — The Four Divisions

```cobol
      *> ‼️ Columns matter in fixed-format COBOL:
      *>   1-6:  Sequence number (or blank)
      *>   7:    Indicator (* = comment, - = continuation, / = page eject, D = debug)
      *>   8-11: Area A — Division/Section/Paragraph headers, FD, 01/77 levels
      *>   12-72: Area B — code statements
      *>   73-80: Identification (ignored by compiler)

       IDENTIFICATION DIVISION.
       PROGRAM-ID.   PAYROLL-CALC.
       AUTHOR.       JOHN SMITH.
      *> ‼️ IDENTIFICATION DIVISION identifies the program to the compiler/JCL

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
           SOURCE-COMPUTER.  IBM-ZOS.
           OBJECT-COMPUTER.  IBM-ZOS.
       INPUT-OUTPUT SECTION.
           FILE-CONTROL.
               SELECT EMPLOYEE-FILE ASSIGN TO EMPFILE
                   ORGANIZATION IS SEQUENTIAL
                   ACCESS MODE IS SEQUENTIAL
                   FILE STATUS IS WS-FILE-STATUS.
      *> ‼️ ENVIRONMENT DIVISION links logical file names to physical datasets (JCL)

       DATA DIVISION.
      *> FILE SECTION — describes record layouts for files
      *> WORKING-STORAGE SECTION — variables (persist for program lifetime)
      *> LOCAL-STORAGE SECTION — variables (re-initialized on each CALL)
      *> LINKAGE SECTION — parameters passed from calling program

       PROCEDURE DIVISION.
      *> All executable statements go here
           PERFORM INITIALIZE-PROGRAM
           PERFORM PROCESS-EMPLOYEES UNTIL WS-EOF-FLAG = 'Y'
           PERFORM WRAP-UP
           STOP RUN.
      *> ‼️ STOP RUN terminates the program and returns control to OS/JCL
      *> EXIT PROGRAM returns control to the calling program (subroutines)
```

---

## 2. Data Division — Working-Storage & File Section

### Level Numbers & Data Hierarchy

```cobol
       DATA DIVISION.
       WORKING-STORAGE SECTION.

      *> ‼️ Level numbers define hierarchy:
      *>   01      — top-level group or elementary item
      *>   02-49   — subordinate items (indent for readability)
      *>   66      — RENAMES — aliases for a range of items
      *>   77      — standalone elementary item (non-hierarchical)
      *>   88      — condition name (named values for an item)

       01 WS-EMPLOYEE-RECORD.
           05 WS-EMP-ID         PIC 9(6).
           05 WS-EMP-NAME.
               10 WS-FIRST-NAME PIC X(20).
               10 WS-LAST-NAME  PIC X(20).
           05 WS-SALARY         PIC 9(7)V99.       *> V = implied decimal
           05 WS-DEPARTMENT     PIC X(3).
           05 WS-STATUS         PIC X(1).
               88 WS-ACTIVE     VALUE 'A'.          *> ‼️ condition name
               88 WS-INACTIVE   VALUE 'I' 'T'.     *> multiple values

       77 WS-TAX-RATE           PIC V99 VALUE .25.  *> standalone, no group
       77 WS-LINE-COUNT         PIC 9(4) VALUE ZEROS.
       77 WS-EOF-FLAG           PIC X(1) VALUE 'N'.
           88 WS-END-OF-FILE    VALUE 'Y'.

      *> ‼️ PIC (Picture) clause — defines data type and size:
      *>   9       — numeric digit
      *>   X       — alphanumeric character
      *>   A       — alphabetic character
      *>   V       — implied decimal point (stored, not printed)
      *>   S       — sign (leading/trailing)
      *>   Z       — numeric, suppress leading zeros in display
      *>   $, -, + — editing characters (display/print formats only)

       01 WS-PRINT-SALARY       PIC ZZZ,ZZZ.99.    *> edited: suppress zeros, comma, decimal
       01 WS-FORMATTED-AMT      PIC $$$,$$9.99-.    *> floating $ sign, trailing minus
```

### REDEFINES & COPY

```cobol
      *> REDEFINES — overlay same storage with different layout ‼️
       01 WS-DATE-AREA.
           05 WS-DATE-YYYYMMDD    PIC X(8).

       01 WS-DATE-SPLIT REDEFINES WS-DATE-AREA.
           05 WS-YEAR             PIC 9(4).
           05 WS-MONTH            PIC 9(2).
           05 WS-DAY              PIC 9(2).

      *> Both describe the same 8 bytes — access via either name
      *> MOVE '20240315' TO WS-DATE-YYYYMMDD
      *> DISPLAY WS-YEAR    → 2024
      *> DISPLAY WS-MONTH   → 03

      *> COPY — include pre-written record layouts from a copybook library ‼️
      *> Industry standard: define all file/record layouts in copybooks for reuse
       01 WS-CUSTOMER-RECORD.
           COPY CUSTMSTR.          *> includes the copybook CUSTMSTR from library
      *> Or with REPLACING:
           COPY CUSTMSTR REPLACING ==:CUST:== BY ==BILLING==.
      *> Replaces pseudo-text :CUST: with BILLING throughout the copy
```

---

## 3. Procedure Division — Control Flow

### MOVE, COMPUTE & Arithmetic

```cobol
       PROCEDURE DIVISION.

      *> MOVE — assign values ‼️
           MOVE 'ACTIVE'         TO WS-STATUS.        *> literal to item
           MOVE WS-EMP-ID        TO WS-DISPLAY-ID.    *> item to item
           MOVE ZEROS            TO WS-LINE-COUNT.     *> figurative constant
           MOVE SPACES           TO WS-EMP-NAME.
           MOVE CORR WS-INPUT-REC TO WS-WORK-REC.     *> CORRESPONDING — match by name ‼️

      *> ‼️ Figurative constants: ZEROS/ZEROES, SPACES/SPACE, NULLS, HIGH-VALUES, LOW-VALUES
      *>   HIGH-VALUES = X'FF...FF' (maximum value) — used for end-of-table sentinel
      *>   LOW-VALUES  = X'00...00' (minimum value)

      *> COMPUTE — arithmetic expression ‼️ preferred over ADD/SUBTRACT/etc.
           COMPUTE WS-NET-PAY = WS-SALARY - (WS-SALARY * WS-TAX-RATE).
           COMPUTE WS-AREA    = 3.14159 * WS-RADIUS ** 2.   *> ** = exponentiation

      *> ‼️ ON SIZE ERROR — numeric overflow trap
           COMPUTE WS-RESULT = WS-BIG-NUM * WS-MULTIPLIER
               ON SIZE ERROR
                   MOVE 'Y' TO WS-OVERFLOW-FLAG
                   PERFORM ERROR-ROUTINE
           END-COMPUTE.

      *> Older arithmetic verbs (still common in legacy code)
           ADD WS-BONUS TO WS-SALARY.             *> WS-SALARY = WS-SALARY + WS-BONUS
           ADD 100 TO WS-SALARY GIVING WS-TOTAL.  *> WS-TOTAL = WS-SALARY + 100
           SUBTRACT WS-TAX FROM WS-PAY.
           MULTIPLY WS-HOURS BY WS-RATE GIVING WS-GROSS.
           DIVIDE WS-TOTAL BY 12 GIVING WS-MONTHLY REMAINDER WS-LEFTOVER.
```

### Conditionals & Perform

```cobol
      *> IF / ELSE / END-IF
           IF WS-ACTIVE                            *> ‼️ 88-level condition name!
               PERFORM PROCESS-ACTIVE-EMP
           ELSE IF WS-SALARY > 50000
               PERFORM HIGH-EARNER-ROUTINE
           ELSE
               NEXT SENTENCE                       *> do nothing (legacy)
           END-IF.

      *> EVALUATE — structured switch/case ‼️
           EVALUATE TRUE                           *> compare each WHEN against TRUE
               WHEN WS-DEPARTMENT = 'ENG'
                   PERFORM ENGINEERING-PROCESS
               WHEN WS-DEPARTMENT = 'HR'
                    OR WS-DEPARTMENT = 'FIN'
                   PERFORM ADMIN-PROCESS
               WHEN WS-SALARY > 100000 AND WS-ACTIVE
                   PERFORM PREMIUM-PROCESS
               WHEN OTHER
                   PERFORM DEFAULT-PROCESS
           END-EVALUATE.

      *> EVALUATE also works like a classic switch:
           EVALUATE WS-RETURN-CODE
               WHEN 0    PERFORM SUCCESS-ROUTINE
               WHEN 4    PERFORM WARNING-ROUTINE
               WHEN 8 THRU 16 PERFORM ERROR-ROUTINE
               WHEN OTHER    PERFORM UNKNOWN-ROUTINE
           END-EVALUATE.

      *> PERFORM — call a paragraph or inline loop ‼️
           PERFORM INITIALIZE-TOTALS.              *> call paragraph once

           PERFORM PROCESS-RECORD
               UNTIL WS-END-OF-FILE.              *> loop until condition

           PERFORM VARYING WS-INDEX FROM 1 BY 1
               UNTIL WS-INDEX > WS-TABLE-SIZE
               PERFORM PROCESS-TABLE-ENTRY
           END-PERFORM.

           PERFORM 10 TIMES                        *> fixed iteration count
               ADD 1 TO WS-COUNTER
           END-PERFORM.

      *> Inline PERFORM with END-PERFORM
           PERFORM UNTIL WS-EOF-FLAG = 'Y'
               READ EMPLOYEE-FILE
                   AT END MOVE 'Y' TO WS-EOF-FLAG
                   NOT AT END PERFORM PROCESS-EMPLOYEE
               END-READ
           END-PERFORM.
```

---

## 4. File Handling

```cobol
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT EMPLOYEE-FILE  ASSIGN TO EMPFILE
               ORGANIZATION IS SEQUENTIAL
               ACCESS MODE   IS SEQUENTIAL
               FILE STATUS   IS WS-FILE-STATUS.

           SELECT EMPLOYEE-VSAM  ASSIGN TO EMPVSAM
               ORGANIZATION IS INDEXED          *> ‼️ VSAM KSDS — key-sequenced
               ACCESS MODE   IS RANDOM          *> or SEQUENTIAL or DYNAMIC
               RECORD KEY    IS EMP-ID
               ALTERNATE RECORD KEY IS EMP-SSN WITH DUPLICATES
               FILE STATUS   IS WS-VSAM-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  EMPLOYEE-FILE
           BLOCK CONTAINS 0 RECORDS             *> let OS determine block size
           RECORDING MODE IS F                  *> F=fixed, V=variable, U=undefined
           LABEL RECORDS ARE STANDARD.
       01  EMPLOYEE-RECORD.
           05 EMP-ID            PIC 9(6).
           05 EMP-NAME          PIC X(40).
           05 EMP-SALARY        PIC 9(7)V99 COMP-3.  *> COMP-3 = packed decimal ‼️

       PROCEDURE DIVISION.
           OPEN INPUT  EMPLOYEE-FILE.           *> open for reading
           OPEN OUTPUT REPORT-FILE.             *> open for writing (overwrites)
           OPEN EXTEND EMPLOYEE-FILE.           *> append to existing file
           OPEN I-O    EMPLOYEE-VSAM.           *> read + write (VSAM)

           READ EMPLOYEE-FILE
               AT END     MOVE 'Y' TO WS-EOF-FLAG
               NOT AT END PERFORM PROCESS-RECORD
           END-READ.

           WRITE REPORT-RECORD FROM WS-PRINT-LINE.     *> sequential write
           WRITE REPORT-RECORD FROM WS-DETAIL
               AFTER ADVANCING 2 LINES.                *> ‼️ printer control

      *> VSAM random read by key
           MOVE '000123' TO EMP-ID.
           READ EMPLOYEE-VSAM
               INVALID KEY     PERFORM NOT-FOUND-ROUTINE
               NOT INVALID KEY PERFORM FOUND-ROUTINE
           END-READ.

      *> VSAM rewrite (update in place) ‼️
           REWRITE EMPLOYEE-RECORD FROM WS-UPDATED-RECORD.

           CLOSE EMPLOYEE-FILE REPORT-FILE.     *> ‼️ always CLOSE — flushes buffers

      *> ‼️ FILE STATUS codes:
      *>   00 = success
      *>   10 = end of file (AT END)
      *>   22 = duplicate key (WRITE to indexed file)
      *>   23 = record not found (READ with INVALID KEY)
      *>   35 = file not found (OPEN)
```

---

## 5. Tables (Arrays) & SEARCH

```cobol
       DATA DIVISION.
       WORKING-STORAGE SECTION.

      *> Fixed-size table — OCCURS clause ‼️
       01 WS-MONTH-TABLE.
           05 WS-MONTH-ENTRY OCCURS 12 TIMES
               INDEXED BY WS-MONTH-IDX.
               10 WS-MONTH-NAME    PIC X(9).
               10 WS-MONTH-DAYS    PIC 9(2).
               10 WS-MONTH-REVENUE PIC 9(9)V99.

      *> Variable-size table — OCCURS DEPENDING ON ‼️
       01 WS-EMPLOYEE-TABLE.
           05 WS-EMP-COUNT         PIC 9(3).
           05 WS-EMP-ENTRY OCCURS 1 TO 500 TIMES
               DEPENDING ON WS-EMP-COUNT
               INDEXED BY WS-EMP-IDX.
               10 WS-EMP-ID        PIC 9(6).
               10 WS-EMP-NAME      PIC X(30).
               10 WS-EMP-SALARY    PIC 9(7)V99.

       PROCEDURE DIVISION.
      *> Access table elements — 1-based ‼️
           MOVE 'JANUARY' TO WS-MONTH-NAME(1).
           MOVE 31        TO WS-MONTH-DAYS(1).

      *> SET — manipulate index ‼️ (SET is for indexes, MOVE is for subscripts)
           SET WS-MONTH-IDX TO 1.
           SET WS-MONTH-IDX UP BY 1.     *> increment index

      *> SEARCH — linear search (SEARCH ALL = binary search on sorted table) ‼️
           SET WS-EMP-IDX TO 1.
           SEARCH WS-EMP-ENTRY
               AT END PERFORM NOT-FOUND-ROUTINE
               WHEN WS-EMP-ID(WS-EMP-IDX) = WS-TARGET-ID
                   PERFORM FOUND-ROUTINE
           END-SEARCH.

      *> SEARCH ALL — binary search (table must be sorted by key) ‼️
      *> Requires: ASCENDING KEY or DESCENDING KEY in OCCURS clause
           SEARCH ALL WS-EMP-ENTRY
               AT END PERFORM NOT-FOUND-ROUTINE
               WHEN WS-EMP-ID(WS-EMP-IDX) = WS-TARGET-ID
                   PERFORM FOUND-ROUTINE
           END-SEARCH.

      *> Multi-dimensional table — OCCURS within OCCURS
       01 WS-SALES-TABLE.
           05 WS-REGION OCCURS 4 TIMES
               INDEXED BY WS-REG-IDX.
               10 WS-QUARTER OCCURS 4 TIMES
                   INDEXED BY WS-QTR-IDX.
                   15 WS-SALES PIC 9(9)V99.
      *> Access: WS-SALES(WS-REG-IDX WS-QTR-IDX) or WS-SALES(2 3)
```

---

## 6. String Handling

```cobol
      *> STRING — concatenate fields into one ‼️
           STRING WS-FIRST-NAME DELIMITED BY SPACE
                  ' '           DELIMITED BY SIZE
                  WS-LAST-NAME  DELIMITED BY SPACE
               INTO WS-FULL-NAME
               WITH POINTER WS-PTR
               ON OVERFLOW PERFORM STRING-OVERFLOW
           END-STRING.
      *> DELIMITED BY SPACE — stop at first space
      *> DELIMITED BY SIZE  — use entire field

      *> UNSTRING — split a string into parts ‼️
           UNSTRING WS-CSV-LINE
               DELIMITED BY ','
               INTO WS-FIELD1 WS-FIELD2 WS-FIELD3
               WITH POINTER WS-PTR
               TALLYING WS-FIELD-COUNT
               ON OVERFLOW PERFORM TOO-MANY-FIELDS
           END-UNSTRING.

      *> INSPECT — scan and count/replace characters ‼️
           INSPECT WS-EMP-NAME
               TALLYING WS-SPACE-COUNT FOR ALL SPACES.

           INSPECT WS-AMOUNT-FIELD
               CONVERTING SPACES TO ZEROS.      *> replace all spaces with zeros

           INSPECT WS-PHONE
               REPLACING ALL '-' BY SPACES.

      *> MOVE with reference modification — substring ‼️
      *>   WS-FIELD(start : length)
           MOVE WS-DATE-YYYYMMDD(1:4) TO WS-YEAR.   *> chars 1-4
           MOVE WS-DATE-YYYYMMDD(5:2) TO WS-MONTH.  *> chars 5-6
           MOVE WS-DATE-YYYYMMDD(7:2) TO WS-DAY.    *> chars 7-8

      *> FUNCTION — built-in functions ‼️
           MOVE FUNCTION UPPER-CASE(WS-NAME)  TO WS-NAME.
           MOVE FUNCTION LENGTH(WS-FIELD)     TO WS-LEN.
           MOVE FUNCTION CURRENT-DATE         TO WS-TIMESTAMP.
           MOVE FUNCTION NUMVAL('  123.45')   TO WS-AMOUNT.  *> string to number
           MOVE FUNCTION INTEGER-OF-DATE(20240315) TO WS-INT-DATE.
           COMPUTE WS-RESULT = FUNCTION SQRT(WS-VALUE).
```

---

## 7. Modern COBOL & Mainframe Context

### COBOL in the Modern Enterprise

```text
‼️ COBOL is NOT dead — it processes an estimated $3 trillion in daily commerce.
   Banks, insurance companies, government agencies run mission-critical COBOL on IBM z/OS mainframes.
   ~220 billion lines of COBOL code still in production worldwide.
   Modern COBOL (COBOL 2002, 2014) supports OOP, Unicode, XML/JSON processing.

Mainframe context:
  z/OS  — IBM's mainframe OS, primary COBOL runtime
  JCL   — Job Control Language, runs COBOL batch jobs
  CICS  — Customer Information Control System, online transaction processing
  IMS   — Information Management System, hierarchical database
  DB2   — IBM's relational database (SQL embedded in COBOL)
  VSAM  — Virtual Storage Access Method, indexed file system
  RACF  — security, job-level access control

Typical COBOL shop:
  Batch jobs (overnight): JCL → COBOL programs → read/write VSAM or sequential files
  Online transactions: CICS → COBOL → DB2 (millions of TPS on mainframe)
  Modernization: wrapping COBOL in REST APIs, Java facades, or moving to microservices
```

### SQL Embedded in COBOL (DB2)

```cobol
      *> Embedded SQL — SQL statements in COBOL programs ‼️
      *> Preprocessed by DB2 precompiler, then compiled as COBOL

       DATA DIVISION.
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.    *> SQL Communication Area — status codes

       01 WS-HOST-VARS.
           05 HV-EMP-ID     PIC 9(6).
           05 HV-EMP-NAME   PIC X(30).
           05 HV-SALARY     PIC 9(7)V99 COMP-3.

       PROCEDURE DIVISION.
      *> Single row fetch
           MOVE '000123' TO HV-EMP-ID.
           EXEC SQL
               SELECT EMP_NAME, SALARY
               INTO :HV-EMP-NAME, :HV-SALARY   *> ‼️ : prefix = host variable
               FROM EMPLOYEE
               WHERE EMP_ID = :HV-EMP-ID
           END-EXEC.

           IF SQLCODE = 0
               PERFORM PROCESS-EMPLOYEE
           ELSE IF SQLCODE = +100              *> +100 = NOT FOUND ‼️
               PERFORM NOT-FOUND-ROUTINE
           ELSE
               PERFORM SQL-ERROR-ROUTINE
           END-IF.

      *> Cursor — for multi-row result sets ‼️
           EXEC SQL
               DECLARE EMP-CURSOR CURSOR FOR
               SELECT EMP_ID, EMP_NAME, SALARY
               FROM EMPLOYEE
               WHERE DEPT_CODE = :HV-DEPT
               ORDER BY EMP_NAME
           END-EXEC.

           EXEC SQL OPEN EMP-CURSOR END-EXEC.

           PERFORM UNTIL SQLCODE = +100
               EXEC SQL
                   FETCH EMP-CURSOR
                   INTO :HV-EMP-ID, :HV-EMP-NAME, :HV-SALARY
               END-EXEC
               IF SQLCODE = 0
                   PERFORM PROCESS-EMPLOYEE
               END-IF
           END-PERFORM.

           EXEC SQL CLOSE EMP-CURSOR END-EXEC.
```

---

## 8. Common Interview Questions

```text
Q: What are the four divisions of a COBOL program?
A: IDENTIFICATION — program name, author, date (metadata).
   ENVIRONMENT — hardware config, file-to-dataset assignments.
   DATA — all data definitions (FILE SECTION, WORKING-STORAGE, LINKAGE).
   PROCEDURE — executable statements, paragraphs, sections.

Q: What is the difference between WORKING-STORAGE and LOCAL-STORAGE?
A: WORKING-STORAGE — initialized once at program start, retains values across CALLs (like static).
   LOCAL-STORAGE — re-initialized on every CALL to the subprogram (like stack variables).
   ‼️ Use LOCAL-STORAGE for recursive programs or when fresh state is needed each call.

Q: What does COMP-3 mean?
A: Packed decimal (BCD) — two decimal digits stored per byte. 9(7)V99 COMP-3 = 5 bytes.
   More compact than display format (one digit per byte). Faster arithmetic on mainframes.
   ‼️ Most financial fields on mainframes use COMP-3 for performance and space efficiency.
   COMP (COMP-4) = binary integer. COMP-1 = single-precision float. COMP-2 = double-precision.

Q: What is the difference between PERFORM and CALL?
A: PERFORM — executes a paragraph or section within the SAME program. In-line control transfer.
   CALL — invokes a separate compiled subprogram (load module). Can pass data via LINKAGE SECTION.
   CALL is for reusable modules; PERFORM is for internal structure.

Q: What is an 88-level item?
A: A condition name — assigns a name to specific value(s) of a data item.
   IF WS-STATUS = 'A' becomes IF WS-ACTIVE — more readable and maintainable.
   ‼️ SET WS-ACTIVE TO TRUE moves 'A' to WS-STATUS — the condition drives the value.

Q: What is the difference between SEARCH and SEARCH ALL?
A: SEARCH — linear/serial search, O(n), table can be in any order, uses WHEN.
   SEARCH ALL — binary search, O(log n), table MUST be sorted by the key (ASCENDING/DESCENDING KEY).
   ‼️ Always use SEARCH ALL for large tables if sorted — massive performance difference.

Q: What is FILE STATUS and why is it important?
A: A 2-character data item that receives the result of every file operation.
   00 = success, 10 = end of file, 22 = duplicate key, 23 = not found, 35 = file not found.
   ‼️ Always check FILE STATUS after OPEN, READ, WRITE, REWRITE, DELETE — production code must
   handle all non-zero statuses or risk silent data corruption.
```
