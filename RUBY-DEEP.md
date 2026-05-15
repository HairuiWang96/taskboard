# Ruby — Senior Developer Deep Reference

> Covers the object model, metaprogramming, blocks/procs/lambdas, modules, concurrency, and Rails for web backends.

---

## Table of Contents

1. [Object Model & Everything is an Object](#1-object-model--everything-is-an-object)
2. [Blocks, Procs & Lambdas](#2-blocks-procs--lambdas)
3. [Modules, Mixins & Metaprogramming](#3-modules-mixins--metaprogramming)
4. [Symbols, Strings & Frozen Literals](#4-symbols-strings--frozen-literals)
5. [Concurrency — GIL, Threads & Ractors](#5-concurrency--gil-threads--ractors)
6. [Rails — Web Backend](#6-rails--web-backend)
7. [Common Interview Questions](#7-common-interview-questions)

---

## 1. Object Model & Everything is an Object

### The Unified Object Model

```ruby
# ‼️ Everything in Ruby is an object — including integers, nil, true, false
42.class          # Integer
nil.class         # NilClass
true.class        # TrueClass
method(:puts).class # Method

# Every class is an instance of Class, which is itself an instance of Class ‼️
Integer.class     # Class
Class.class       # Class
Class.superclass  # Module
Module.superclass # Object
Object.superclass # BasicObject
# Lookup chain: Integer → Numeric → Comparable → Object → Kernel → BasicObject

# Classes are open — reopen and extend any class (monkey patching)
class Integer
    def factorial
        return 1 if self <= 1
        self * (self - 1).factorial
    end
end
5.factorial  # 120

# ‼️ Prefer refinements over monkey patching to limit scope
module IntegerExtensions
    refine Integer do
        def factorial
            return 1 if self <= 1
            self * (self - 1).factorial
        end
    end
end

using IntegerExtensions  # activate only in this scope
5.factorial  # 120
```

### Method Lookup Chain

```ruby
# ‼️ Ruby method lookup order (crucial for understanding includes/extends/prepends):
# 1. The object's singleton class (methods defined on just this object)
# 2. Prepended modules (in reverse order of prepending)
# 3. The class itself
# 4. Included modules (in reverse order of inclusion)
# 5. Superclass (and its modules) — recursively

module Greetable
    def greet = "Hello from #{self.class}"
end

class Person
    include Greetable
    def greet = super + ", specifically Person"
end

class Employee < Person
end

Employee.ancestors
# [Employee, Person, Greetable, Object, Kernel, BasicObject]
# ‼️ Method lookup walks this list left to right

# Singleton class — methods defined on a specific object
alice = Person.new
def alice.special_greet = "I'm Alice, special!"
alice.special_greet     # works
Person.new.special_greet # NoMethodError — only alice has it
```

---

## 2. Blocks, Procs & Lambdas

### Blocks

```ruby
# Block — anonymous chunk of code, not an object, passed to a method
[1, 2, 3].each { |n| puts n }         # single-line block
[1, 2, 3].each do |n|                  # multi-line block
    puts n * 2
end

# yield — call the block from inside a method
def run_twice
    yield
    yield
end
run_twice { puts "Hello" }  # prints "Hello" twice

# yield with arguments
def transform(x)
    yield(x) if block_given?  # ‼️ check if block was provided
end
transform(5) { |n| n * 2 }  # 10
transform(5)                  # nil — no block, no error

# &block — capture block as an explicit Proc parameter
def run_with_logging(&block)
    puts "Starting"
    result = block.call
    puts "Done: #{result}"
end
run_with_logging { 42 }
```

### Procs vs Lambdas

```ruby
# Proc — block converted to an object
square = Proc.new { |n| n ** 2 }
square.call(5)  # 25
square.(5)      # same — sugar for .call
square[5]       # same

# Lambda — Proc with stricter behavior
cube = lambda { |n| n ** 3 }
cube = ->(n) { n ** 3 }  # ‼️ stabby lambda syntax (preferred)
cube.call(3)    # 27
cube.lambda?    # true

# ‼️ Key differences: Proc vs Lambda
# 1. Argument checking:
#    Lambda: raises ArgumentError for wrong arity
#    Proc:   silently assigns nil for missing args, ignores extra
add = ->(a, b) { a + b }
# add.call(1)        # ArgumentError ‼️ lambda

mul = Proc.new { |a, b| a.to_i * b.to_i }
mul.call(3)         # 0 — b is nil, nil.to_i = 0

# 2. Return behavior ‼️ — the BIG difference
def test_lambda
    l = -> { return 10 }  # return exits the lambda only
    l.call
    return 20
end
test_lambda  # 20 — lambda return is local

def test_proc
    p = Proc.new { return 10 }  # return exits the ENCLOSING METHOD ‼️
    p.call
    return 20
end
test_proc  # 10 — proc return escapes the whole method

# Converting between block and proc
def double_each(arr, &block)   # & converts block → Proc
    arr.map(&block)            # & converts Proc → block
end
double_each([1,2,3]) { |n| n * 2 }  # [2, 4, 6]

# Symbol to proc — common pattern
["hello", "world"].map(&:upcase)  # ["HELLO", "WORLD"]
# &:upcase is shorthand for { |s| s.upcase }
```

---

## 3. Modules, Mixins & Metaprogramming

### Modules as Mixins

```ruby
module Serializable
    def to_json
        vars = instance_variables.map do |var|
            "\"#{var.to_s.delete('@')}\": #{instance_variable_get(var).inspect}"
        end
        "{#{vars.join(', ')}}"
    end
end

module Validatable
    def valid?
        validate.empty?
    end

    def validate
        []  # subclasses override
    end
end

class User
    include Serializable   # ‼️ include — adds as instance methods
    include Validatable
    extend Comparable      # ‼️ extend — adds as class-level (singleton) methods

    attr_accessor :name, :email

    def initialize(name, email)
        @name  = name
        @email = email
    end

    def validate
        errors = []
        errors << "Name required"  if name.nil? || name.empty?
        errors << "Email invalid"  unless email&.include?("@")
        errors
    end
end

# ‼️ include vs extend vs prepend:
# include — mixed in as instance methods, added AFTER class in ancestors
# extend  — mixed in as singleton (class-level) methods on a specific object or the class
# prepend — mixed in BEFORE the class in ancestors (can wrap/override methods with super)
```

### Metaprogramming

```ruby
# define_method — define methods programmatically
class Logger
    %w[debug info warn error].each do |level|
        define_method("log_#{level}") do |message|
            puts "[#{level.upcase}] #{message}"
        end
    end
end

logger = Logger.new
logger.log_debug("Starting up")  # [DEBUG] Starting up
logger.log_error("Crash!")       # [ERROR] Crash!

# method_missing — intercept undefined method calls ‼️
class FlexibleProxy
    def initialize(target)
        @target = target
    end

    def method_missing(name, *args, &block)
        if @target.respond_to?(name)
            @target.send(name, *args, &block)  # delegate to target
        else
            super  # ‼️ always call super — lets NoMethodError propagate normally
        end
    end

    def respond_to_missing?(name, include_private = false)
        @target.respond_to?(name) || super  # ‼️ always define with method_missing
    end
end

# class_eval / instance_eval — evaluate code in context of a class/object
String.class_eval do
    def shout = upcase + "!!!"
end
"hello".shout  # "HELLO!!!"

# attr_accessor — metaprogramming under the hood (generates getter/setter)
# Roughly equivalent to:
class Foo
    def name      = @name         # getter
    def name=(val) ; @name = val  # setter
end

# send — call method by name (including private methods)
"hello".send(:upcase)         # "HELLO" — same as "hello".upcase
obj.send(:private_method)     # ‼️ can call private — use public_send for safety
obj.public_send(:public_only) # raises NoMethodError for private methods
```

---

## 4. Symbols, Strings & Frozen Literals

```ruby
# Symbol — immutable, interned (same symbol == same object in memory)
:hello.object_id == :hello.object_id  # true ‼️ — same object every time
"hello".object_id == "hello".object_id # false — new String object each time

# Symbols are ideal for: hash keys, method names, identifiers
config = { host: "localhost", port: 5432 }  # symbol keys (common pattern)

# String vs Symbol:
# Symbol: immutable, unique, no string methods, < memory per use
# String: mutable, can be duplicated, full string API

# Frozen string literals — enable at top of file for immutable strings
# frozen_string_literal: true

str = "hello"
str.frozen?    # false by default
str.freeze     # make immutable
str << " world" # FrozenError ‼️

# String interning
"hello".freeze.equal?("hello".freeze)  # may be true (implementation-dependent)

# ‼️ frozen_string_literal: true is recommended for performance
# Every string literal becomes frozen — no accidental mutation, less GC pressure
# To get a mutable copy: str = +"hello" (unary + on frozen string = mutable dup)
mutable = +"frozen".freeze  # +"" creates mutable string
```

---

## 5. Concurrency — GIL, Threads & Ractors

### The Global Interpreter Lock (GIL/GVL)

```ruby
# ‼️ MRI Ruby has a Global VM Lock (GVL) — only one thread runs Ruby code at a time
# The GVL is released during blocking I/O (network, disk) — so threads DO help for I/O
# The GVL is NOT released during CPU-bound work — threads don't parallelize CPU work

# Threads — share memory, GVL prevents true parallelism for CPU work
threads = 5.times.map do |i|
    Thread.new do
        result = fetch_from_api(i)  # GVL released during I/O — true concurrency ✓
        process(result)             # GVL held — serialized ✗ for CPU-bound
    end
end
threads.each(&:join)  # ‼️ always join — don't let threads leak

# Mutex — protect shared mutable state
mutex   = Mutex.new
counter = 0

10.times.map do
    Thread.new do
        mutex.synchronize { counter += 1 }  # ‼️ atomic increment
    end
end.each(&:join)

# ‼️ Thread-safe data structures: Queue (blocking), SizedQueue, Mutex, ConditionVariable

# Ractors (Ruby 3.0+) — true parallelism, each has own GVL
# ‼️ Ractors cannot share mutable objects — enforce isolation
r = Ractor.new do
    Ractor.yield("Hello from Ractor")
end
puts r.take  # "Hello from Ractor"

# CPU-bound parallel work with Ractors
results = (1..4).map do |n|
    Ractor.new(n) { |x| x ** 10_000_000 }  # runs in parallel ‼️
end.map(&:take)
```

---

## 6. Rails — Web Backend

### MVC & Request Lifecycle

```text
‼️ Rails request lifecycle:
  1. Router (config/routes.rb) — matches path to controller#action
  2. Middleware stack — runs before controller (logging, session, CSRF, etc.)
  3. Controller — instantiated, action method called
  4. Model — ActiveRecord queries, business logic
  5. View — ERB/Haml rendered with instance vars from controller
  6. Response — rendered HTML/JSON returned through middleware stack
```

### Active Record

```ruby
# Model — inherits from ApplicationRecord (ActiveRecord::Base)
class Order < ApplicationRecord
    belongs_to :user
    has_many   :line_items, dependent: :destroy
    has_one    :invoice
    has_many   :products, through: :line_items

    # Validations
    validates :status, inclusion: { in: %w[pending active cancelled] }
    validates :total,  numericality: { greater_than: 0 }
    validates :user,   presence: true

    # Scopes — reusable query fragments
    scope :active,      -> { where(status: "active") }
    scope :high_value,  -> (min = 1000) { where("total >= ?", min) }
    scope :recent,      -> { order(created_at: :desc) }

    # Callbacks ‼️ use sparingly — can create hidden coupling
    before_create  :generate_reference
    after_commit   :send_confirmation, on: :create  # ‼️ after_commit safer than after_create

    # Enums (Rails 7+)
    enum :status, { pending: 0, active: 1, cancelled: 2 }, prefix: true

    private

    def generate_reference
        self.reference = SecureRandom.hex(8).upcase
    end
end

# Querying
Order.active.high_value(500).recent.limit(20)
Order.where(user: current_user).includes(:line_items, :invoice)  # ‼️ eager load
Order.joins(:user).where(users: { city: "NYC" })
Order.select(:id, :total).where("total > ?", 100)
Order.find_each(batch_size: 500) { |o| process(o) }  # ‼️ batch processing — no OOM

# ‼️ N+1 — query for each association
orders = Order.all
orders.each { |o| puts o.user.name }  # ✗ N+1: 1 + N queries

orders = Order.includes(:user).all   # ✓ 2 queries total
# ‼️ includes → separate queries; joins → SQL JOIN (use for filtering, includes for loading)
```

### Controllers & Strong Parameters

```ruby
class OrdersController < ApplicationController
    before_action :authenticate_user!
    before_action :set_order, only: [:show, :update, :destroy]
    before_action :authorize_order!, only: [:update, :destroy]

    def index
        @orders = current_user.orders.active.recent.page(params[:page])
        render json: @orders, status: :ok
    end

    def create
        @order = current_user.orders.build(order_params)
        if @order.save
            OrderMailer.confirmation(@order).deliver_later  # background job
            render json: @order, status: :created
        else
            render json: { errors: @order.errors.full_messages }, status: :unprocessable_entity
        end
    end

    private

    # ‼️ Strong parameters — whitelist permitted attributes to prevent mass assignment
    def order_params
        params.require(:order).permit(:status, :notes,
            line_items_attributes: [:product_id, :quantity, :price, :_destroy])
    end

    def set_order
        @order = Order.find(params[:id])
    rescue ActiveRecord::RecordNotFound
        render json: { error: "Not found" }, status: :not_found
    end

    def authorize_order!
        head :forbidden unless @order.user == current_user
    end
end
```

### Background Jobs & Caching

```ruby
# Active Job — framework-agnostic job interface
class ProcessPaymentJob < ApplicationJob
    queue_as :critical
    retry_on PaymentGateway::TransientError, wait: :polynomially_longer, attempts: 5
    discard_on PaymentGateway::InvalidCardError

    def perform(order_id)
        order = Order.find(order_id)
        PaymentGateway.charge!(order)
        order.update!(status: :paid)
    end
end

# Enqueue
ProcessPaymentJob.perform_later(order.id)
ProcessPaymentJob.set(wait: 5.minutes).perform_later(order.id)

# ‼️ Always pass IDs, not objects — ActiveRecord objects don't serialize cleanly
# ‼️ Jobs must be idempotent — may be retried after partial execution

# Caching
Rails.cache.fetch("user_#{user.id}_profile", expires_in: 1.hour) do
    # expensive operation — only runs on cache miss
    UserProfileBuilder.new(user).build
end

# Fragment caching in views
# <% cache @order do %>
#   ... expensive rendering ...
# <% end %>
# Cache key derived from order's cache_key_with_version (updated_at + id) ‼️

# Russian doll caching — nested cache fragments
# <% cache @order do %>
#   <% @order.line_items.each do |item| %>
#     <% cache item do %>  <!-- inner fragment has own key -->
#       <%= render item %>
#     <% end %>
#   <% end %>
# <% end %>
```

### Concerns & Service Objects

```ruby
# Concern — reusable module for models/controllers
module Archivable
    extend ActiveSupport::Concern

    included do
        scope :archived,   -> { where.not(archived_at: nil) }
        scope :unarchived, -> { where(archived_at: nil) }
    end

    def archive!
        update!(archived_at: Time.current)
    end

    def unarchive!
        update!(archived_at: nil)
    end
end

class Order < ApplicationRecord
    include Archivable
end

# Service Object — encapsulate complex business logic
class Orders::CreateService
    def initialize(user:, params:)
        @user   = user
        @params = params
    end

    def call
        ActiveRecord::Base.transaction do
            order = @user.orders.create!(order_attributes)
            reserve_inventory!(order)
            charge_payment!(order)
            send_confirmation!(order)
            order
        end
    rescue ActiveRecord::RecordInvalid => e
        Result.failure(e.record.errors.full_messages)
    end

    private

    def order_attributes = @params.slice(:notes, :shipping_address)
    def reserve_inventory!(order) = InventoryService.reserve(order)
    def charge_payment!(order)    = PaymentService.charge(order)
    def send_confirmation!(order) = OrderMailer.confirmation(order).deliver_later
end
```

---

## 7. Common Interview Questions

```text
Q: What is the difference between a Proc and a Lambda?
A: Both are Proc objects, but:
   Argument handling: lambda checks arity (raises ArgumentError); Proc silently ignores.
   Return: lambda return exits the lambda. Proc return exits the enclosing method.
   ‼️ Use lambda when you want function-like behavior; Proc when you want a detached block.

Q: What is the method lookup chain (MRO)?
A: Ruby looks up methods in this order:
   singleton class → prepended modules (reverse order) → class → included modules (reverse) → superclass.
   Module.ancestors shows the full chain. ‼️ prepend inserts before the class; include after.

Q: What is the GVL and how does it affect concurrency?
A: Global VM Lock — MRI Ruby only runs one Ruby thread at a time.
   Threads help for I/O-bound work (GVL released during blocking I/O).
   Threads don't parallelize CPU-bound work.
   Solutions: JRuby/TruffleRuby (no GVL), Ractors (Ruby 3+, true parallelism with isolation).

Q: What is the difference between include and extend?
A: include — mixes module methods as instance methods on all instances of the class.
   extend — mixes module methods as class-level (singleton) methods, or instance methods on a single object.
   extend on an object: obj.extend(Mod) — adds Mod methods only to obj.

Q: What does respond_to_missing? do and why is it important?
A: When you define method_missing, you must also define respond_to_missing? so that
   respond_to?(:missing_method) returns true, and .method(:missing_method) works.
   Without it, external code can't discover the dynamic methods — breaks duck typing.

Q: How does Rails prevent N+1 queries?
A: Use includes(:association) to eager load. Rails issues 2 queries (load models, load association).
   joins is for filtering (SQL JOIN), includes is for loading (separate query).
   Bullet gem detects N+1 in development. Use explain to check query plans.

Q: What is a transaction and when do you need one?
A: ActiveRecord::Base.transaction groups SQL statements — all succeed or all roll back.
   Use for: any multi-step operation that must be atomic (create order + reserve inventory).
   ‼️ Callbacks inside transactions can still send emails/jobs — use after_commit to ensure
   the transaction committed before sending. after_create fires before commit.
```
