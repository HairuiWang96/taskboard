# R — Senior Developer Deep Reference

> Covers R data types, vectorization, functional programming, tidyverse, statistical modeling, and performance.

---

## Table of Contents

1. [Data Types & Vectors](#1-data-types--vectors)
2. [Data Frames & Tibbles](#2-data-frames--tibbles)
3. [Functional Programming](#3-functional-programming)
4. [tidyverse — dplyr & tidyr](#4-tidyverse--dplyr--tidyr)
5. [ggplot2 — Data Visualization](#5-ggplot2--data-visualization)
6. [Statistical Modeling](#6-statistical-modeling)
7. [Performance & Rcpp](#7-performance--rcpp)
8. [Common Interview Questions](#8-common-interview-questions)

---

## 1. Data Types & Vectors

### Atomic Vectors

```r
# ‼️ R is 1-indexed (not 0-indexed!)
# Everything in R is a vector — scalars are length-1 vectors

# Atomic types:
lgl <- c(TRUE, FALSE, NA)          # logical
int <- c(1L, 2L, 3L)               # integer (L suffix)
dbl <- c(1.5, 2.7, 3.14)           # double (default numeric)
chr <- c("hello", "world")         # character
cpl <- c(1+2i, 3+4i)               # complex

typeof(42L)    # "integer"
typeof(42)     # "double"
typeof("hi")   # "character"
class(42L)     # "integer"

# ‼️ NA — "not available", propagates through operations
NA + 5         # NA
is.na(NA)      # TRUE — always use is.na(), never == NA
NA == NA       # NA — not TRUE! ‼️

# NULL — the absence of a value (length 0, no type)
# Different from NA: NA is a missing value, NULL is nothing
is.null(NULL)  # TRUE
length(NULL)   # 0

# Type coercion hierarchy (implicit): logical < integer < double < complex < character
c(TRUE, 1L, 2.5)   # c(1, 1, 2.5) — coerced to double
c(1L, "a")         # c("1", "a")  — coerced to character ‼️
```

### Subsetting

```r
x <- c(10, 20, 30, 40, 50)

# Positive index — select
x[2]         # 20 — ‼️ 1-indexed!
x[c(1, 3)]   # 10 30
x[2:4]       # 20 30 40

# Negative index — exclude
x[-2]        # 10 30 40 50
x[c(-1, -5)] # 20 30 40

# Logical index — filter
x[x > 25]    # 30 40 50
x[c(TRUE, FALSE, TRUE, FALSE, TRUE)] # 10 30 50

# Named subsetting
y <- c(a = 1, b = 2, c = 3)
y["b"]       # b: 2
y[c("a","c")] # a: 1, c: 3

# ‼️ [ preserves structure (returns vector), [[ extracts single element
lst <- list(a = 1:3, b = "hello")
lst["a"]    # returns a list of length 1
lst[["a"]]  # returns the vector 1:3 directly ‼️
lst$a       # same as lst[["a"]]

# Matrix subsetting — [row, col]
m <- matrix(1:9, nrow = 3)
m[2, 3]     # row 2, col 3
m[1, ]      # entire row 1
m[, 2]      # entire col 2 — ‼️ drops to vector by default
m[, 2, drop = FALSE] # preserve matrix structure
```

### Factors

```r
# Factor — categorical variable with defined levels
# Stored as integers with a levels attribute — memory efficient for repeated categories

status <- factor(c("low", "high", "med", "high", "low"),
                 levels = c("low", "med", "high"),  # ‼️ define order explicitly
                 ordered = TRUE)                     # ordered factor (for comparisons)

levels(status)   # "low" "med" "high"
nlevels(status)  # 3
as.integer(status) # 1 2 3 2 1 — underlying integer codes

# ‼️ Factors trap: adding new values creates NA
status[6] <- "extreme"  # NA — "extreme" not in levels

# Dropping unused levels
status <- droplevels(status)

# forcats package — modern factor manipulation
library(forcats)
fct_relevel(status, "high", "med", "low")  # reorder levels
fct_lump_n(var, n = 5)                     # lump rare levels into "Other"
fct_reorder(factor_var, numeric_var)        # reorder by another variable (for plots)
```

---

## 2. Data Frames & Tibbles

### Data Frames

```r
# Data frame — list of equal-length vectors (columns)
df <- data.frame(
    name   = c("Alice", "Bob", "Carol"),
    age    = c(30, 25, 35),
    active = c(TRUE, FALSE, TRUE),
    stringsAsFactors = FALSE  # ‼️ R < 4.0 converts strings to factors by default
)

nrow(df); ncol(df); dim(df); str(df); summary(df)

# Subsetting data frames
df[1, ]         # first row — returns data.frame
df[, "age"]     # age column — returns vector
df$age          # same
df[df$age > 28, ]       # filter rows
df[, c("name", "age")]  # select columns

# Adding/modifying columns
df$score <- c(90, 85, 95)
df[["grade"]] <- c("A", "B", "A")
```

### Tibbles (tidyverse)

```r
library(tibble)

# Tibble — modern data frame with better defaults
tbl <- tibble(
    name   = c("Alice", "Bob"),
    age    = c(30, 25),
    scores = list(c(90, 95), c(80, 85))  # ‼️ list-columns — store any R object per row
)

# ‼️ Key differences from data.frame:
#   - Never converts strings to factors
#   - Never changes column names (no make.names())
#   - Prints only first 10 rows with types shown
#   - [[ always returns vector; [ always returns tibble
#   - No partial matching on $ (warns instead)

# Constructing from existing data
as_tibble(mtcars)

# glimpse — compact view of all columns
glimpse(tbl)
```

---

## 3. Functional Programming

### Apply Family

```r
# apply — over rows (1) or columns (2) of a matrix/data.frame
m <- matrix(1:12, nrow = 3)
apply(m, 1, sum)   # row sums → vector
apply(m, 2, mean)  # col means → vector

# lapply — over a list, returns a list
lapply(1:5, function(x) x^2)  # list of 5 squares

# sapply — like lapply but simplifies result ‼️
sapply(1:5, function(x) x^2)  # named numeric vector (simplified)
# ‼️ sapply silently changes return type — use lapply in packages for predictable type

# vapply — sapply with type guarantee ‼️ preferred in production
vapply(1:5, function(x) x^2, numeric(1))  # guaranteed numeric vector

# tapply — apply by group (like SQL GROUP BY)
tapply(df$salary, df$department, mean)  # mean salary per department

# Map / Reduce / Filter (base R functional)
Map(function(x, y) x + y, 1:3, 4:6)   # elementwise → list(5, 7, 9)
Reduce("+", 1:5)                        # 15 (fold left)
Reduce("+", 1:5, accumulate = TRUE)     # 1 3 6 10 15 (running total)
Filter(function(x) x %% 2 == 0, 1:10)  # even numbers
```

### purrr (tidyverse functional)

```r
library(purrr)

# map — always returns a list
map(1:5, ~ .x^2)          # list(1, 4, 9, 16, 25)

# Typed map — guaranteed return type ‼️
map_dbl(1:5, ~ .x^2)      # numeric vector
map_chr(1:5, ~ paste0("item_", .x))  # character vector
map_lgl(1:5, ~ .x > 3)    # logical vector
map_int(1:5, ~ .x * 2L)   # integer vector

# map2 — over two vectors in parallel
map2_dbl(1:5, 6:10, ~ .x + .y) # c(7, 9, 11, 13, 15)

# pmap — over multiple vectors (from a list)
params <- list(n = c(5, 10), mean = c(0, 1), sd = c(1, 2))
pmap(params, rnorm)  # invoke rnorm(n=5,mean=0,sd=1) then rnorm(n=10,mean=1,sd=2)

# walk — like map but for side effects (no return value)
walk(plots, ~ ggsave(paste0(.x$name, ".png"), .x$plot))

# keep / discard — filter elements
keep(1:10, ~ .x %% 2 == 0)     # even numbers
discard(1:10, ~ .x %% 2 == 0)  # odd numbers

# reduce / accumulate
reduce(1:5, `+`)               # 15
accumulate(1:5, `+`)           # 1 3 6 10 15
```

---

## 4. tidyverse — dplyr & tidyr

### dplyr — Data Manipulation

```r
library(dplyr)

# Core verbs — all take data frame as first arg, return data frame
orders |>                               # ‼️ |> is native pipe (R 4.1+), %>% is magrittr
    filter(status == "active", amount > 100) |>   # row filter
    select(id, customer, amount, date) |>          # column selection
    mutate(
        tax    = amount * 0.1,
        total  = amount + tax,
        month  = lubridate::month(date),
        grade  = case_when(                        # vectorized if-else
            amount > 1000 ~ "premium",
            amount > 500  ~ "standard",
            TRUE          ~ "basic"
        )
    ) |>
    arrange(desc(amount), customer) |>             # sort
    slice_head(n = 10)                             # first 10 rows

# Grouped operations ‼️
orders |>
    group_by(customer_id, month) |>
    summarise(
        total_orders = n(),
        total_amount = sum(amount),
        avg_amount   = mean(amount),
        .groups      = "drop"           # ‼️ always specify .groups to avoid warning
    ) |>
    filter(total_orders >= 3)

# across — apply function to multiple columns ‼️
df |> mutate(across(where(is.numeric), ~ round(.x, 2)))
df |> summarise(across(c(age, salary), list(mean = mean, sd = sd)))

# Joins
left_join(orders, customers, by = "customer_id")
inner_join(a, b, by = c("id" = "user_id"))  # different column names
anti_join(orders, cancelled, by = "id")     # rows in orders NOT in cancelled
```

### tidyr — Reshaping

```r
library(tidyr)

# Pivot longer — wide to long (tidy format) ‼️
wide <- tibble(
    name   = c("Alice", "Bob"),
    jan    = c(100, 200),
    feb    = c(150, 250),
    mar    = c(120, 220)
)
long <- wide |> pivot_longer(
    cols      = jan:mar,
    names_to  = "month",
    values_to = "revenue"
)

# Pivot wider — long to wide
long |> pivot_wider(names_from = month, values_from = revenue)

# Unnest — expand list-columns
df |> unnest(scores)  # one row per score per person

# Separate / unite
df |> separate(full_name, into = c("first", "last"), sep = " ")
df |> unite("full_name", first, last, sep = " ")

# Complete / fill — handle missing combinations
df |> complete(name, month)         # fill all name×month combinations with NA
df |> fill(value, .direction = "down")  # fill NA with last non-NA value
```

---

## 5. ggplot2 — Data Visualization

```r
library(ggplot2)

# ‼️ Grammar of Graphics: data + aesthetics + geometry + scales + facets + theme

ggplot(data = diamonds, aes(x = carat, y = price, color = cut)) +
    geom_point(alpha = 0.3, size = 1) +
    geom_smooth(method = "lm", se = TRUE) +
    scale_x_log10() +
    scale_y_log10(labels = scales::dollar) +
    scale_color_brewer(palette = "Set1") +
    facet_wrap(~ cut, nrow = 2) +     # small multiples by cut
    labs(
        title    = "Diamond Price vs Carat",
        subtitle = "Log scale, colored by cut",
        x        = "Carat (log)",
        y        = "Price (log)",
        color    = "Cut Quality"
    ) +
    theme_minimal() +
    theme(legend.position = "bottom")

# Common geoms:
# geom_histogram(), geom_density()   — distributions
# geom_boxplot(), geom_violin()      — group distributions
# geom_bar(), geom_col()             — counts vs pre-computed values
# geom_line()                        — time series
# geom_tile()                        — heatmaps
# geom_text(), geom_label()          — annotations

# ‼️ aes() in ggplot() = global; aes() in geom_*() = local (overrides)
# ‼️ Color inside aes() → maps variable to color scale
# ‼️ Color outside aes() → fixed color for all points
ggplot(df, aes(x, y)) +
    geom_point(aes(color = group)) +  # color mapped to variable
    geom_line(color = "blue")          # fixed color

# Save
ggsave("plot.png", width = 8, height = 6, dpi = 300)
```

---

## 6. Statistical Modeling

### Linear & Generalized Linear Models

```r
# Linear regression
model <- lm(price ~ carat + depth + table, data = diamonds)
summary(model)
# Coefficients, R-squared, F-statistic, p-values

coef(model)           # extract coefficients
fitted(model)         # predicted values for training data
residuals(model)      # observed - fitted
confint(model)        # 95% confidence intervals
predict(model, newdata = new_df) # predictions on new data

# ‼️ Formula syntax:
# y ~ x           — simple regression
# y ~ x1 + x2     — multiple regression
# y ~ x1 * x2     — interaction (x1, x2, and x1:x2)
# y ~ x1:x2       — interaction only
# y ~ x1 + I(x1^2) — polynomial (I() prevents formula interpretation)
# y ~ .            — all columns in data

# Generalized Linear Model
logit_model <- glm(
    survived ~ age + pclass + sex,
    data   = titanic,
    family = binomial(link = "logit")  # logistic regression
)
# family: binomial (logistic), poisson (count), Gamma, gaussian (= lm)

# Model diagnostics
par(mfrow = c(2, 2)); plot(model)  # residual plots
car::vif(model)                    # variance inflation factor (multicollinearity)

# ANOVA
anova(model1, model2)              # compare nested models
```

### tidymodels — Modern ML Framework

```r
library(tidymodels)

# Split data
set.seed(42)
split   <- initial_split(diamonds, prop = 0.8, strata = price)
train   <- training(split)
test    <- testing(split)

# Recipe — preprocessing pipeline
rec <- recipe(price ~ ., data = train) |>
    step_log(price, carat) |>         # log transform
    step_dummy(all_nominal_predictors()) |>  # one-hot encode
    step_normalize(all_numeric_predictors()) |> # z-score normalize
    step_nzv(all_predictors())        # remove near-zero variance

# Model spec
rf_spec <- rand_forest(trees = 500, mtry = tune()) |>
    set_engine("ranger") |>
    set_mode("regression")

# Workflow
wf <- workflow() |>
    add_recipe(rec) |>
    add_model(rf_spec)

# Cross-validation tuning
folds <- vfold_cv(train, v = 5)
grid  <- grid_regular(mtry(range = c(2, 8)), levels = 4)
res   <- tune_grid(wf, resamples = folds, grid = grid,
                   metrics = metric_set(rmse, rsq))

best  <- select_best(res, metric = "rmse")
final <- finalize_workflow(wf, best) |> fit(train)
predictions <- predict(final, test)
```

---

## 7. Performance & Rcpp

### Vectorization vs Loops

```r
# ‼️ R loops are slow — vectorized operations use compiled C code internally

# ✗ Slow: growing vector in a loop
result <- c()
for (i in 1:1e5) result <- c(result, i^2)  # O(n²) — copies entire vector each time

# ✓ Fast: pre-allocate or vectorize
result <- numeric(1e5)
for (i in seq_along(result)) result[i] <- i^2   # pre-allocated O(n)
result <- (1:1e5)^2                               # ✓✓ fully vectorized — fastest

# Benchmarking
library(microbenchmark)
microbenchmark(
    loop   = { r <- numeric(1e4); for(i in 1:1e4) r[i] <- i^2 },
    vector = (1:1e4)^2,
    times  = 100
)

# ‼️ Profiling — find where time is actually spent
Rprof("profile.out")
expensive_function()
Rprof(NULL)
summaryRprof("profile.out")

# Or use profvis
library(profvis)
profvis({ expensive_function() })
```

### Rcpp — C++ in R

```r
# Rcpp — write C++ functions called from R for performance-critical code
library(Rcpp)

cppFunction('
double meanC(NumericVector x) {
    int n = x.size();
    double total = 0;
    for (int i = 0; i < n; i++) {
        total += x[i];
    }
    return total / n;
}
')

x <- rnorm(1e6)
microbenchmark(
    R_mean    = mean(x),
    cpp_mean  = meanC(x)
)
# meanC is typically 2-5x faster than base mean for this pattern

# Rcpp sugar — vectorized C++ using R-like syntax
cppFunction('
NumericVector colwiseMeans(NumericMatrix m) {
    int cols = m.ncol();
    NumericVector means(cols);
    for (int j = 0; j < cols; j++) {
        means[j] = mean(m(_, j));   // _ selects all rows
    }
    return means;
}
')
```

---

## 8. Common Interview Questions

```text
Q: What is the difference between NA and NULL in R?
A: NA — missing value, has a type (NA_integer_, NA_real_, NA_character_), length 1.
   NULL — absence of a value, no type, length 0. Used to represent "no object".
   NA propagates in calculations. NULL removes elements when assigned to list members.

Q: Why is growing a vector in a loop slow?
A: c(result, new_value) allocates a new vector of length n+1 and copies all n existing
   elements each iteration — O(n²) total copies. Pre-allocate with vector(length = n)
   or use vectorized operations which call compiled C code.

Q: What is the difference between [ and [[ ?
A: [ preserves the container type — list["a"] returns a list of length 1.
   [[ extracts a single element — list[["a"]] returns the element itself.
   $ is shorthand for [[ with partial matching (‼️ dangerous in scripts).
   Use [[ in packages; [ when you want to keep the list/data.frame structure.

Q: What is tidy data?
A: Each variable is a column, each observation is a row, each observational unit is a table.
   Tidy data is required by ggplot2 and dplyr. pivot_longer/pivot_wider reshape to/from tidy.
   Opposite: wide format (common in Excel) — multiple observations per row.

Q: What is the difference between %>% and |> ?
A: Both pipe the left-hand side as the first argument to the right-hand side function.
   |> is the native pipe (R 4.1+), zero dependencies, slightly faster.
   %>% (magrittr) supports . placeholder for non-first-arg piping, and %T>%, %$%.
   Prefer |> for new code; use placeholder with (\(x) ...) if needed: x |> (\(x) f(y, x))()

Q: How does R copy-on-modify work?
A: R uses copy-on-modify semantics — assignment shares the same object until either
   copy is modified. x <- y; y[1] <- 0 → y gets a new copy, x is unchanged.
   This enables memory efficiency (no unnecessary copies) while preserving value semantics.
   tracemem() can verify when copies actually occur.
```
