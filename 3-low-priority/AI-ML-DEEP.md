# AI & Machine Learning — Senior Developer Deep Reference
**Priority: MEDIUM**

> Covers: ML fundamentals, NumPy, Pandas, Scikit-learn, neural networks, PyTorch, LLMs, and the modern AI engineering landscape.

---

## Table of Contents

1. [ML Fundamentals](#1-ml-fundamentals)
2. [NumPy — Numerical Computing](#2-numpy--numerical-computing)
3. [Pandas — Data Manipulation](#3-pandas--data-manipulation)
4. [Scikit-learn — Classical ML](#4-scikit-learn--classical-ml)
5. [Neural Networks & Deep Learning](#5-neural-networks--deep-learning)
6. [PyTorch Basics](#6-pytorch-basics)
7. [LLMs & the Modern AI Stack](#7-llms--the-modern-ai-stack)
8. [MLOps — Production ML](#8-mlops--production-ml)
9. [Common Interview Questions](#9-common-interview-questions)

---

## 1. ML Fundamentals

### Types of machine learning

```text
Supervised Learning:
  Labeled training data (input → known output).
  Goal: learn a function that maps inputs to outputs.
  Examples: classification, regression.
  Algorithms: linear regression, decision trees, SVMs, neural networks.

Unsupervised Learning:
  No labels — find hidden structure in data.
  Examples: clustering, dimensionality reduction, anomaly detection.
  Algorithms: k-means, DBSCAN, PCA, autoencoders.

Reinforcement Learning:
  Agent takes actions in an environment, receives rewards/penalties.
  Goal: maximize cumulative reward.
  Examples: game playing (AlphaGo), robotics, recommendation systems.

Self-supervised Learning (modern):
  Labels derived from the data itself — no human annotation.
  Examples: LLMs (predict the next word), BERT (masked token prediction).
  This is how most modern foundation models are trained.
```

### The ML workflow

```text
1. Problem definition: what are we predicting? What is the success metric?
2. Data collection: gather, clean, label training data
3. Exploratory Data Analysis (EDA): understand distributions, correlations, missing values
4. Feature engineering: transform raw data into informative features
5. Model selection: choose algorithm(s) to try
6. Training: fit model to training data
7. Evaluation: measure performance on held-out test set
8. Iteration: tune hyperparameters, add features, try different models
9. Deployment: serve predictions in production
10. Monitoring: detect drift — model performance degrades over time
```

### Key concepts

```text
Features (X): the input variables — what the model sees
Target (y):   the output variable — what the model predicts
Training set:  data used to fit the model
Validation set: data used to tune hyperparameters (never seen during training)
Test set:      data used to measure final performance (held out until the very end)

Overfitting:  model memorizes training data, performs poorly on new data
  Signs: high training accuracy, low test accuracy
  Fixes: more training data, regularization, simpler model, dropout

Underfitting: model is too simple to learn the pattern
  Signs: low accuracy on both training and test data
  Fix: more complex model, more features, more training time

Bias-variance tradeoff:
  High bias   = underfitting (model assumptions too simple)
  High variance = overfitting (model too sensitive to training noise)
  Goal: find the sweet spot
```

### Evaluation metrics

```text
Classification:
  Accuracy:   (TP + TN) / total — misleading for imbalanced classes
  Precision:  TP / (TP + FP) — "of predicted positives, how many are correct?"
  Recall:     TP / (TP + FN) — "of actual positives, how many did we catch?"
  F1:         harmonic mean of precision and recall — balance between the two
  AUC-ROC:    area under the receiver operating characteristic curve (0.5=random, 1=perfect)

  In healthcare (Solace context):
    High recall for disease detection is critical — minimize false negatives (missed diagnoses)
    Precision matters for treatment recommendations — minimize false positives (unnecessary treatment)

Regression:
  MAE:  Mean Absolute Error — average magnitude of errors
  MSE:  Mean Squared Error — penalizes large errors more
  RMSE: Root MSE — same units as target
  R²:   how much variance is explained by the model (1 = perfect, 0 = baseline mean)
```

---

## 2. NumPy — Numerical Computing

```python
import numpy as np

# ndarray — the core data structure (N-dimensional array)
# Much faster than Python lists for numerical operations (C implementation)

# Creating arrays
a = np.array([1, 2, 3, 4, 5])          # from list
b = np.zeros((3, 4))                     # 3x4 matrix of zeros
c = np.ones((2, 3))                      # 2x3 matrix of ones
d = np.eye(3)                            # 3x3 identity matrix
e = np.arange(0, 10, 2)                 # [0, 2, 4, 6, 8] (like range)
f = np.linspace(0, 1, 5)               # [0, .25, .5, .75, 1] (evenly spaced)
g = np.random.randn(100)                # 100 standard normal samples
h = np.random.randint(0, 10, (3, 3))   # 3x3 random integers 0-9

# Array properties
a.shape     # (5,)          — tuple of dimensions
a.dtype     # dtype('int64')
a.ndim      # 1             — number of dimensions
a.size      # 5             — total number of elements
```

### Array operations (vectorized — no loops needed)

```python
a = np.array([1, 2, 3, 4])
b = np.array([10, 20, 30, 40])

# Element-wise operations
a + b       # [11, 22, 33, 44]
a * b       # [10, 40, 90, 160]
a ** 2      # [1, 4, 9, 16]
np.sqrt(a)  # [1, 1.41, 1.73, 2]

# Broadcasting: operations between different shapes
matrix = np.ones((3, 4))  # shape (3, 4)
row    = np.array([1, 2, 3, 4])  # shape (4,)
matrix + row  # row is broadcast to (3, 4) — added to each row

# Aggregations
a.sum()     # 10
a.mean()    # 2.5
a.std()     # standard deviation
a.max()     # 4
a.argmax()  # 3 (index of max)
a.cumsum()  # [1, 3, 6, 10]

# Along an axis
m = np.array([[1, 2, 3], [4, 5, 6]])
m.sum(axis=0)  # [5, 7, 9]  — sum down columns
m.sum(axis=1)  # [6, 15]    — sum across rows
```

### Indexing and slicing

```python
a = np.arange(10)           # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
a[3]                        # 3
a[2:5]                      # [2, 3, 4]
a[::2]                      # [0, 2, 4, 6, 8]
a[::-1]                     # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]

m = np.array([[1,2,3],[4,5,6],[7,8,9]])
m[0, 1]                     # 2 (row 0, col 1)
m[:, 1]                     # [2, 5, 8] (all rows, col 1)
m[1:, :2]                   # [[4,5], [7,8]] (rows 1+, cols 0-1)

# Boolean indexing (mask)
a = np.array([1, 5, 2, 8, 3, 9])
mask = a > 4                # [False, True, False, True, False, True]
a[mask]                     # [5, 8, 9]
a[a > 4]                    # same — shorthand

# Fancy indexing
a[[0, 2, 4]]                # [1, 2, 3] — select by index list

# Reshape (doesn't copy data)
a = np.arange(12)
a.reshape(3, 4)             # 3x4 matrix
a.reshape(2, 2, 3)          # 3D array
a.flatten()                 # always returns a copy
a.ravel()                   # returns a view when possible (prefer this)
```

---

## 3. Pandas — Data Manipulation

```python
import pandas as pd

# Two core data structures:
# Series:    1D labeled array (like a dict + numpy array)
# DataFrame: 2D table with labeled rows and columns

# Creating DataFrames
df = pd.DataFrame({
    "name":  ["Alice", "Bob", "Charlie"],
    "age":   [30, 25, 35],
    "score": [92.5, 88.0, 95.5],
})

df = pd.read_csv("data.csv")
df = pd.read_json("data.json")
df = pd.read_sql("SELECT * FROM users", connection)

# Basic inspection
df.head(5)           # first 5 rows
df.tail(5)           # last 5 rows
df.info()            # column types, null counts
df.describe()        # statistics (mean, std, min, max, quartiles)
df.shape             # (rows, columns)
df.dtypes            # data types of each column
df.isnull().sum()    # count nulls per column
```

### Selection and filtering

```python
# Column selection
df["name"]                  # Series
df[["name", "age"]]         # DataFrame (double brackets)

# Row selection
df.loc[0]                   # by label (index)
df.loc[0:2, "name":"age"]   # rows 0-2, cols name to age (inclusive)
df.iloc[0]                  # by integer position
df.iloc[0:3, 0:2]           # first 3 rows, first 2 columns

# Boolean filtering
df[df["age"] > 30]
df[(df["age"] > 25) & (df["score"] > 90)]  # AND
df[(df["age"] < 25) | (df["score"] > 90)]  # OR
df[df["name"].isin(["Alice", "Charlie"])]
df[df["name"].str.startswith("A")]
df[df["score"].between(85, 95)]

# query method (readable alternative)
df.query("age > 30 and score > 90")
```

### Data manipulation

```python
# Add/modify columns
df["grade"] = df["score"].apply(lambda x: "A" if x >= 90 else "B")
df["age_doubled"] = df["age"] * 2

# Drop
df.drop("age_doubled", axis=1, inplace=True)  # drop column
df.drop([0, 2], axis=0)                        # drop rows by index

# Rename
df.rename(columns={"name": "full_name"}, inplace=True)

# Sort
df.sort_values("score", ascending=False)
df.sort_values(["age", "score"], ascending=[True, False])

# Missing values
df.isnull()                    # boolean mask
df.dropna()                    # drop rows with any nulls
df.dropna(subset=["score"])    # drop if 'score' is null
df.fillna(0)                   # fill with value
df.fillna(df.mean())           # fill with column mean
df["age"].fillna(df["age"].median(), inplace=True)

# Apply
df["score"].apply(lambda x: round(x))
df.apply(lambda row: f"{row['name']}: {row['score']}", axis=1)  # row-wise
```

### GroupBy — the most powerful feature

```python
# groupby: split → apply → combine
grouped = df.groupby("department")

# Aggregation
grouped["salary"].mean()          # mean salary per department
grouped.agg({"salary": "mean", "age": "median"})

# Multiple aggregations
grouped["salary"].agg(["mean", "median", "std", "count"])

# Transform (keep original shape — broadcast result back to each row)
df["salary_zscore"] = grouped["salary"].transform(
    lambda x: (x - x.mean()) / x.std()
)

# Filter groups
grouped.filter(lambda x: x["salary"].mean() > 60000)

# Named aggregation (pandas 0.25+)
df.groupby("department").agg(
    avg_salary=("salary", "mean"),
    headcount=("name", "count"),
    max_age=("age", "max"),
)
```

### Merge and join

```python
# Like SQL JOIN
users  = pd.DataFrame({"user_id": [1,2,3], "name": ["A","B","C"]})
orders = pd.DataFrame({"order_id": [1,2,3], "user_id": [1,1,2], "amount": [100,200,50]})

# INNER JOIN
pd.merge(users, orders, on="user_id")

# LEFT JOIN
pd.merge(users, orders, on="user_id", how="left")

# Concat (stack DataFrames)
pd.concat([df1, df2], ignore_index=True)     # stack rows
pd.concat([df1, df2], axis=1)                # stack columns
```

---

## 4. Scikit-learn — Classical ML

```python
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# The universal Scikit-learn API
# Every model has: .fit(X, y), .predict(X), .score(X, y)

# 1. Prepare data
X = df.drop("target", axis=1).values
y = df["target"].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
# random_state for reproducibility

# 2. Preprocess
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)  # fit AND transform train
X_test  = scaler.transform(X_test)       # only transform test (never fit on test!)

# 3. Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 4. Evaluate
y_pred = model.predict(X_test)
print(accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))

# Cross-validation (more reliable than single train/test split)
scores = cross_val_score(model, X, y, cv=5, scoring="f1_weighted")
print(f"CV F1: {scores.mean():.3f} ± {scores.std():.3f}")
```

### Pipeline — prevent data leakage

```python
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

# Pipeline: chain of steps — fit_transform flows through automatically
# Critical: prevents data leakage (scaler sees only training data stats)

pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),    # fill missing values
    ("scaler", StandardScaler()),                      # normalize
    ("model", RandomForestClassifier(n_estimators=100)),
])

# Single fit call trains the whole pipeline
pipeline.fit(X_train, y_train)
pipeline.predict(X_test)
pipeline.score(X_test, y_test)

# Hyperparameter tuning with GridSearchCV
from sklearn.model_selection import GridSearchCV

param_grid = {
    "model__n_estimators": [50, 100, 200],
    "model__max_depth": [None, 5, 10],
}

grid_search = GridSearchCV(pipeline, param_grid, cv=5, scoring="f1_weighted", n_jobs=-1)
grid_search.fit(X_train, y_train)
print(grid_search.best_params_)
print(grid_search.best_score_)
```

### Feature importance and selection

```python
# Tree-based models: feature_importances_
model = RandomForestClassifier().fit(X_train, y_train)
importances = pd.Series(model.feature_importances_, index=feature_names)
importances.sort_values(ascending=False).head(10)

# Feature selection
from sklearn.feature_selection import SelectFromModel
selector = SelectFromModel(model, threshold="mean")
X_selected = selector.fit_transform(X_train, y_train)
```

---

## 5. Neural Networks & Deep Learning

### Core concepts

```text
Neuron: weighted sum of inputs + bias → activation function → output
  output = activation(w1*x1 + w2*x2 + ... + wn*xn + b)

Activation functions:
  ReLU:    max(0, x) — most common for hidden layers (fast, no vanishing gradient)
  Sigmoid: 1/(1+e^-x) — output 0-1 — use for binary classification output
  Softmax: multi-class probabilities (sum to 1) — use for multi-class output layer
  Tanh:    -1 to 1 — sometimes used in RNNs

Loss functions:
  Binary cross-entropy:   binary classification (sigmoid output)
  Categorical cross-entropy: multi-class classification (softmax output)
  MSE:                    regression

Backpropagation:
  Compute gradient of loss with respect to each weight.
  Chain rule applied recursively from output layer to input layer.
  Gradient = direction of steepest ascent — update weights opposite direction.

Gradient descent:
  w = w - learning_rate * gradient
  Stochastic GD (SGD): update on each sample
  Mini-batch GD:       update on a batch (e.g., 32 samples) — standard
  Adam:                adaptive learning rates per parameter — usually best default

Epoch:         one full pass through the training data
Batch size:    number of samples processed before updating weights
Learning rate: step size for gradient descent (too high = diverge, too low = slow)

Regularization (prevent overfitting):
  L2 (weight decay): penalize large weights in loss function
  Dropout:           randomly zero out neurons during training
  Batch normalization: normalize layer inputs — faster training, regularization effect
  Early stopping:    stop when validation loss stops improving
```

---

## 6. PyTorch Basics

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

# Tensor — the core data structure (like NumPy array with GPU support)
x = torch.tensor([1.0, 2.0, 3.0])
x = torch.zeros(3, 4)
x = torch.randn(3, 4)   # random normal
x.shape                 # torch.Size([3, 4])
x.dtype                 # torch.float32
x.device                # device(type='cpu')

# Move to GPU (if available)
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
x = x.to(device)

# Gradients — autograd
x = torch.tensor([2.0], requires_grad=True)
y = x ** 2 + 3 * x + 1
y.backward()             # compute gradients
x.grad                   # tensor([7.]) = dy/dx = 2x + 3 at x=2

# Disable gradient tracking (for inference)
with torch.no_grad():
    prediction = model(input)
```

### Defining a model

```python
class TaskPriorityModel(nn.Module):
    def __init__(self, input_size: int, hidden_size: int, output_size: int):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.3),           # 30% dropout during training
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, output_size),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)

model = TaskPriorityModel(input_size=20, hidden_size=128, output_size=3).to(device)
```

### Training loop

```python
# Dataset
class TaskDataset(Dataset):
    def __init__(self, features: np.ndarray, labels: np.ndarray):
        self.X = torch.FloatTensor(features)
        self.y = torch.LongTensor(labels)

    def __len__(self) -> int:
        return len(self.y)

    def __getitem__(self, idx: int):
        return self.X[idx], self.y[idx]

# DataLoader: batching, shuffling, parallel loading
train_loader = DataLoader(TaskDataset(X_train, y_train), batch_size=32, shuffle=True)
val_loader   = DataLoader(TaskDataset(X_val, y_val),   batch_size=32)

# Loss and optimizer
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5)  # reduce LR on plateau

# Training loop
for epoch in range(100):
    # Training phase
    model.train()  # enables dropout, batch norm training mode
    for X_batch, y_batch in train_loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)

        optimizer.zero_grad()         # clear gradients from last step
        outputs = model(X_batch)      # forward pass
        loss = criterion(outputs, y_batch)
        loss.backward()               # compute gradients
        optimizer.step()              # update weights

    # Validation phase
    model.eval()   # disables dropout
    val_loss = 0
    correct  = 0
    with torch.no_grad():
        for X_batch, y_batch in val_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            outputs = model(X_batch)
            val_loss += criterion(outputs, y_batch).item()
            correct  += (outputs.argmax(1) == y_batch).sum().item()

    print(f"Epoch {epoch}: val_loss={val_loss/len(val_loader):.4f}, "
          f"val_acc={correct/len(val_loader.dataset):.4f}")
    scheduler.step(val_loss)
```

---

## 7. LLMs & the Modern AI Stack

### How LLMs work (conceptually)

```text
Transformer architecture (2017 — "Attention Is All You Need"):
  Tokenization: text → integer token IDs
  Embedding:    token IDs → dense vectors
  Attention:    each token attends to all others — captures context
  Feed-forward: token-level transformation
  Repeat N layers
  Output:       probability distribution over next token

Training:
  Trained to predict the next token on trillions of tokens of text.
  Self-supervised — no human labels needed.
  Modern LLMs: hundreds of billions of parameters.

RLHF (Reinforcement Learning from Human Feedback):
  After base training, fine-tune to be helpful/harmless.
  Human raters rank responses → reward model → RL fine-tuning.
  Used by ChatGPT, Claude, Gemini.

Context window:
  Maximum tokens an LLM can process at once.
  GPT-4: 128K tokens (~96K words)
  Claude 3.5: 200K tokens (~150K words)
  Llama 3: 128K tokens
```

### Using LLMs in applications (Anthropic SDK)

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

# Basic completion
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Explain HIPAA in one paragraph."}
    ]
)
print(message.content[0].text)

# System prompt
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    system="You are a healthcare compliance expert. Be concise and accurate.",
    messages=[
        {"role": "user", "content": "What data must be encrypted under HIPAA?"}
    ]
)

# Multi-turn conversation
messages = []
while True:
    user_input = input("You: ")
    messages.append({"role": "user", "content": user_input})

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=messages
    )
    assistant_message = response.content[0].text
    messages.append({"role": "assistant", "content": assistant_message})
    print(f"Claude: {assistant_message}")
```

### Prompt engineering

```text
Zero-shot:   just ask, no examples
  "Classify this patient message as urgent or non-urgent: ..."

Few-shot:    provide examples before the question
  "Examples:
   'Chest pain started 2 hours ago' → urgent
   'Need to reschedule appointment' → non-urgent
   'Difficulty breathing' → ..."

Chain-of-thought (CoT): ask the model to reason step by step
  "Think through this step by step before giving your answer."

Structured output: ask for JSON
  "Return your answer as JSON: { 'category': ..., 'confidence': ..., 'reasoning': ... }"

Temperature:
  0.0 = deterministic (same answer every time) — use for factual tasks
  0.7 = balanced — general use
  1.0 = creative/varied — use for brainstorming, creative writing
```

### RAG — Retrieval-Augmented Generation

```python
# Problem: LLMs have a knowledge cutoff and limited context window.
# Solution: retrieve relevant documents at query time and add to the prompt.

# The pipeline:
# 1. Documents → embedding model → vector store
# 2. Query → embedding model → vector search
# 3. Top-K similar documents + query → LLM → answer

from anthropic import Anthropic

# Simplified RAG example
def rag_query(user_question: str, vector_store, client: Anthropic) -> str:
    # Step 1: embed the query and find similar documents
    relevant_docs = vector_store.similarity_search(user_question, k=3)

    # Step 2: build context from retrieved documents
    context = "\n\n".join([doc.content for doc in relevant_docs])

    # Step 3: send to LLM with context
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system="Answer questions using only the provided context. If unsure, say so.",
        messages=[{
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {user_question}"
        }]
    )
    return response.content[0].text

# Popular vector stores: Pinecone, Weaviate, ChromaDB (local), pgvector (Postgres extension)
# Embedding models: text-embedding-3-small (OpenAI), voyage-3 (Anthropic)
```

### Fine-tuning vs RAG vs prompting

```text
Prompt engineering:
  ✓ Fast, no training needed, flexible
  ✗ Limited by context window, no persistent learning
  Use when: general capability + specific instructions

RAG:
  ✓ Access to large, up-to-date knowledge bases
  ✓ No retraining when knowledge changes
  ✗ Retrieval quality affects answer quality
  Use when: Q&A over large document sets, knowledge that changes often

Fine-tuning:
  ✓ Teaches style, format, and specialized behavior
  ✓ Smaller, faster model for a specific task
  ✗ Expensive, slower to update, requires labeled data
  Use when: specific output format, tone, or domain behavior that prompting can't achieve

In practice: most production AI features use RAG + good prompting.
Fine-tuning is for when the model needs to behave very differently from its base behavior.
```

---

## 8. MLOps — Production ML

```text
MLOps: applying DevOps principles to machine learning.

The ML production challenges:
  - Models degrade over time (data drift, concept drift)
  - Retraining requires data pipelines + infrastructure
  - Experiments must be tracked and reproducible
  - Model serving has latency/cost constraints
  - Multiple model versions in production simultaneously
```

### Key tools

```text
Experiment tracking:
  MLflow:       open source, runs locally or on server
  Weights & Biases (W&B): hosted, excellent UI, team collaboration
  Track: hyperparameters, metrics, artifacts (saved models, plots)

Data versioning:
  DVC:          Git for data + models (links to S3, GCS)
  Delta Lake:   versioned data tables (ACID transactions on S3)

Model serving:
  FastAPI:      build your own prediction API (lightweight)
  TorchServe:   PyTorch model server
  Triton:       NVIDIA's inference server (GPU optimized)
  AWS SageMaker: managed ML deployment on AWS

Feature store:
  Feast, Tecton: precompute and serve features consistently for training + inference
  Prevents training-serving skew (same feature logic in both places)

Monitoring:
  Evidently AI: detect data drift, model performance degradation
  Grafana + Prometheus: custom metrics
  Watch: prediction distribution, input distribution, error rates, latency
```

### MLflow example

```python
import mlflow
import mlflow.sklearn

with mlflow.start_run():
    # Log hyperparameters
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 10)

    # Train
    model = RandomForestClassifier(n_estimators=100, max_depth=10)
    model.fit(X_train, y_train)

    # Log metrics
    val_acc = model.score(X_val, y_val)
    mlflow.log_metric("val_accuracy", val_acc)

    # Log the model itself
    mlflow.sklearn.log_model(model, "model")

# Register the best model for deployment
mlflow.register_model(f"runs:/{run_id}/model", "TaskClassifier")
```

---

## 9. Common Interview Questions

### "What is the difference between supervised and unsupervised learning?"

> Supervised learning uses labeled training data — the model learns a mapping from inputs to known outputs. Examples: classification (predicting a category), regression (predicting a number). Unsupervised learning finds structure in data without labels — examples: k-means clustering (grouping similar items), PCA (dimensionality reduction), anomaly detection. Modern self-supervised learning (LLMs) sits between: labels are derived from the data itself (predict next word) without human annotation.

### "Explain overfitting and how to prevent it."

> Overfitting: the model memorizes training data rather than learning generalizable patterns — high training accuracy, low test accuracy. Prevention: get more training data (best fix), regularization (L1/L2 penalizes large weights), dropout (randomly disable neurons during training), early stopping (stop when validation loss stops improving), cross-validation (evaluate on multiple held-out folds), simpler model (fewer parameters).

### "What is the bias-variance tradeoff?"

> Bias: error from oversimplified model assumptions (underfitting — fails on training data). Variance: error from sensitivity to noise in training data (overfitting — fails on new data). They trade off: increasing model complexity reduces bias but increases variance. Goal: find the point where total error (bias² + variance + irreducible noise) is minimized. Regularization and more data both help reduce variance without increasing bias as much.

### "What is gradient descent?"

> An optimization algorithm that iteratively adjusts model weights to minimize the loss function. Compute the gradient of the loss with respect to each weight (direction of steepest increase), then update weights in the opposite direction (gradient descent). Learning rate controls step size. Mini-batch gradient descent (most common) computes gradients on small batches (32-256 samples) — balance between speed and stability. Adam optimizer adapts the learning rate per parameter — usually the best default.

### "What is the difference between precision and recall? When do you optimize for each?"

> Precision: of all predicted positives, what fraction are correct? (minimize false positives). Recall: of all actual positives, what fraction did you catch? (minimize false negatives). They trade off. Optimize for recall: disease detection, fraud detection, security threats — missing a real case is costly. Optimize for precision: spam filters, recommendation systems — false alarms are costly. F1 score is the harmonic mean of both — use when you need a balance.

### "What is RAG and when would you use it over fine-tuning?"

> RAG (Retrieval-Augmented Generation) retrieves relevant documents at query time and adds them to the LLM's prompt context. Use RAG when your knowledge base is large (can't fit in context), frequently updated (re-training is too slow), or requires citing sources. Use fine-tuning when you need to change the model's behavior, style, or output format — not just what it knows. In practice: start with RAG + good prompting; only fine-tune if you can't achieve the needed behavior with prompting.

---

## Most Asked AI/ML Interview Questions

### "What is the difference between supervised, unsupervised, and reinforcement learning?"

> **Supervised learning** — trains on labeled data (input-output pairs); learns to predict output for new inputs. Examples: classification (spam/not spam), regression (house price). **Unsupervised learning** — no labels; finds patterns and structure in data. Examples: clustering (K-means), dimensionality reduction (PCA), anomaly detection. **Reinforcement learning** — agent learns by taking actions in an environment and receiving rewards/penalties; learns a policy to maximize cumulative reward. Examples: game playing (AlphaGo), robotics, recommendation systems.

### "What is overfitting and how do you prevent it?"

> Overfitting: the model memorizes training data (including noise) and performs poorly on unseen data — high training accuracy, low validation accuracy. Prevention: **Regularization** (L1/L2 — penalizes large weights), **Dropout** (randomly zero out neurons during training), **Early stopping** (stop training when validation loss starts increasing), **More data** (or data augmentation), **Simpler model** (reduce parameters), **Cross-validation** (k-fold to detect overfitting earlier).

### "What is the difference between precision and recall?"

> **Precision** — of all the items predicted positive, what fraction were actually positive? (minimize false positives — use when false alarms are costly: spam filter, fraud alert). **Recall** (sensitivity) — of all actual positives, what fraction did we predict positive? (minimize false negatives — use when missing a case is costly: cancer screening, fraud detection). **F1 score** — harmonic mean of precision and recall — balanced metric when both matter.

```
Precision = TP / (TP + FP)   → "of what I predicted positive, how many were right?"
Recall    = TP / (TP + FN)   → "of all actual positives, how many did I catch?"
F1        = 2 * (P * R) / (P + R)
```

### "What is the bias-variance tradeoff?"

> **Bias** — error from wrong assumptions (underfitting — model too simple, misses patterns). **Variance** — sensitivity to fluctuations in training data (overfitting — model too complex, memorizes noise). The tradeoff: increasing model complexity reduces bias but increases variance. The goal: find the sweet spot (minimum total error). Regularization explicitly manages this. Ensemble methods (bagging, boosting) reduce variance or bias respectively.

### "What is gradient descent?"

> Gradient descent is the optimization algorithm used to train most ML models. The idea: compute the gradient (partial derivatives) of the loss function with respect to model parameters, then step in the opposite direction (downhill). Repeat until convergence. Key variants: **Batch GD** — gradient over whole dataset (accurate but slow). **SGD (Stochastic)** — gradient over one sample (fast, noisy). **Mini-batch SGD** — gradient over a small batch (balance of both — used in practice). **Adam** — adaptive learning rates per parameter, most popular optimizer.

### "What is a neural network and how does backpropagation work?"

> A neural network is layers of neurons (linear transformation + activation function). **Forward pass**: input flows through layers, producing a prediction. **Loss** is computed (how wrong the prediction is). **Backpropagation**: using the chain rule, compute gradients of the loss with respect to every weight — flowing backwards through the network. **Gradient descent** then updates all weights. This is repeated for many batches until loss converges.

### "What is a transformer and what problem did it solve?"

> The Transformer architecture (2017, "Attention Is All You Need") replaced RNNs for sequence tasks. The key innovation: **self-attention** — each token in a sequence attends to all other tokens simultaneously (no sequential processing). This enables: parallelization (much faster training), capturing long-range dependencies (RNNs struggled with long sequences), and massive scaling. All modern LLMs (GPT, BERT, Claude, Gemini) are based on transformers.

### "What is the difference between a generative and discriminative model?"

> **Discriminative** — models the boundary between classes; learns `P(y|x)` — given input, what's the probability of each class? Examples: logistic regression, SVM, most classifiers. **Generative** — models the data distribution; learns `P(x|y)` — given a class, what does the data look like? Can generate new samples. Examples: Naive Bayes, GANs, VAEs, diffusion models, LLMs. LLMs are generative — they learn the distribution of text and generate by sampling from it.

### "What is RAG (Retrieval-Augmented Generation)?"

> RAG combines a retrieval system with a language model. Instead of relying solely on what the LLM memorized during training, RAG retrieves relevant documents from an external knowledge base (vector DB, search index) at inference time and includes them in the prompt as context. Benefits: up-to-date information (not frozen at training cutoff), citable sources, reduced hallucination for factual questions, ability to use private/proprietary data. Standard architecture for building LLM applications over custom data.

### "What are embeddings and how are they used?"

> Embeddings are dense vector representations of data (text, images, users, items) that capture semantic meaning — similar things have similar vectors (close in vector space). Created by neural networks. Uses: semantic search (find similar documents), recommendation systems (similar users/items), RAG (retrieve relevant chunks by similarity), classification, clustering. Tools: OpenAI Embeddings API, sentence-transformers, store in vector DBs (Pinecone, pgvector, Weaviate).

```ts
// Text similarity with embeddings
const vec1 = await embedText("What is machine learning?");
const vec2 = await embedText("Explain supervised learning");
const similarity = cosineSimilarity(vec1, vec2); // high — semantically related

// RAG: retrieve chunks most similar to query
const queryVec = await embedText(userQuery);
const relevant = await vectorDB.search(queryVec, topK: 5);
const context = relevant.map(r => r.text).join('\n');
const answer = await llm.complete(`Context: ${context}\nQuestion: ${userQuery}`);
```
