---
title: Python 基础笔记 · 第 3 章：函数
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 函数, 装饰器, 生成器]
summary: 参数传递机制、五种类别形参与解包、LEGB 作用域、闭包与延迟绑定陷阱、装饰器原理与手写模板、lambda 与高阶函数、生成器迭代器与函数注解，附 14 道高频面试题。
---

## 一、参数：五种类别与书写顺序

```python
def f(a, b=2, *args, c, d=4, **kwargs):
    ...
#    │  │      │     │  │      └─ 多余的关键字参数 → dict
#    │  │      │     │  └──────── 关键字参数（可设默认）
#    │  │      │     └─────────── 仅关键字参数（* 之后）
#    │  │      └───────────────── 多余的位置参数 → tuple
#    │  └──────────────────────── 默认参数
#    └─────────────────────────── 位置参数
```

### 形参的五种写法

- **位置参数**：`def f(a, b)`，必须按顺序传
- **默认参数**：`def f(a, b=2)`，可省略
- **可变位置 `*args`**：收集多余位置参数成元组
- **仅关键字参数**：写在 `*` 之后，必须按名字传 `def f(a, *, b)`
- **仅位置参数 `/`**（3.8+）：写在 `/` 之前，只能用位置传 `def f(a, /, b)`
- **可变关键字 `**kwargs`**：收集多余关键字参数成字典

```python
def f(a, b=2, *args, c, d=4, **kwargs):
    return (a, b, args, c, d, kwargs)

print(f(1, 10, 20, 30, c=5, e=9))
# => (1, 10, (20, 30), 5, 4, {'e': 9})

def g(a, /, b, *, c):    # a 仅位置；b 位置或关键字；c 仅关键字
    return a, b, c
g(1, 2, c=3)             # => (1, 2, 3)
# g(a=1, 2, c=3)         # TypeError: a 不能按关键字传
```

### 参数解包调用

调用时可用 `*` 解包可迭代对象、`**` 解包字典，自动对应到形参：

```python
def add(a, b, c):
    return a + b + c

lst = [1, 2, 3]
d = {'a': 1, 'b': 2, 'c': 3}
print(add(*lst))        # => 6
print(add(**d))         # => 6
```

### 多返回值本质返回 tuple

```python
def divmod2(n, m):
    return n // m, n % m     # 实际返回的是一个 tuple

q, r = divmod2(7, 3)         # 调用方自动解包
print(q, r)                  # => 2 1
print(type(divmod2(7, 3)))   # => <class 'tuple'>
```

### 函数注解（类型提示）

注解不影响运行，只是给静态检查/IDE 看的提示；运行时可用 `typing.get_type_hints()` 读取。

```python
def add(a: int, b: int) -> int:
    return a + b

print(add.__annotations__)            # => {'a': <class 'int'>, 'b': <class 'int'>, 'return': <class 'int'>}
import typing
print(typing.get_type_hints(add))     # 解析字符串/前向引用后的注解
```

---

## 二、参数传递：共享传参

Python 既不是值传递也不是引用传递，而是**传对象的引用（共享传参，call by sharing）**：

```python
def f(x):
    x = 100          # 重新绑定名字，外面完全不受影响

def g(lst):
    lst.append(1)    # 原地修改对象，外面看得到

a = 1;    f(a);   print(a)   # 1      不可变 → 表现像"值传递"
b = [];   g(b);   print(b)   # [1]    可变   → 表现像"引用传递"
```

判据：**函数体内是"重新绑定名字"还是"修改对象本身"**。

> **默认参数必须指向不可变对象**。`def f(x, lst=[])` 的 `lst` 在**函数定义时**就创建了，所有调用共享同一个列表。正确写法是 `lst=None`，在函数体内 `if lst is None: lst = []`。

---

## 三、作用域：LEGB 规则

查找顺序：**L**ocal → **E**nclosing → **G**lobal → **B**uilt-in

```python
x = 1               # global
def outer():
    x = 2           # enclosing
    def inner():
        x = 3       # local
        print(x)    # 3
```

- 想在函数里**修改**全局变量用 `global`
- 想在嵌套函数里**修改**外层变量用 `nonlocal`（否则会被当成新建局部变量而报 `UnboundLocalError`）

```python
counter = 0
def inc():
    global counter
    counter += 1

def make():
    n = 0
    def add():
        nonlocal n
        n += 1
        return n
    return add

a = make()
print(a(), a())     # => 1 2
```

---

## 四、闭包

**闭包 = 函数 + 它引用到的外部作用域变量**。即使外层函数已返回，这些变量依然存活。

```python
def make_adder(n):
    def add(x):
        return x + n      # n 被"记住"了
    return add

add5 = make_adder(5)
add5(3)      # 8
```

### 延迟绑定（late binding）陷阱 ⚠️

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])     # [2, 2, 2]，不是 [0, 1, 2]！
```

循环里的 `i` 是在**调用时**才查找的，那时 `i` 已经是 2。解决方案：

```python
funcs = [lambda i=i: i for i in range(3)]    # 用默认参数立刻绑定
# 或
funcs = [(lambda x: lambda: x)(i) for i in range(3)]
print([f() for f in funcs])     # => [0, 1, 2]
```

---

## 五、装饰器

装饰器本质是**接收函数、返回函数的高阶函数**。`@deco` 等价于 `f = deco(f)`。

### 通用模板（务必背下来）

```python
from functools import wraps

def deco(func):
    @wraps(func)                  # 保留原函数的 __name__、__doc__
    def wrapper(*args, **kwargs):
        # 前置逻辑
        result = func(*args, **kwargs)
        # 后置逻辑
        return result
    return wrapper
```

### 带参数的装饰器（三层嵌套）

```python
def retry(times=3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for i in range(times):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if i == times - 1:
                        raise
        return wrapper
    return decorator

@retry(times=5)
def request(): ...
```

### 叠放顺序

多个装饰器从下往上包：`@a @b @c def f` 等价于 `f = a(b(c(f)))`，离函数最近的 `c` 先包。

```python
@dec_a
@dec_b
@dec_c
def f(): ...
# 等价于 f = dec_a(dec_b(dec_c(f)))
```

### 类装饰器

类只要实现 `__call__` 也能当装饰器，方便在实例上保存状态：

```python
class CountCalls:
    def __init__(self, func):
        self.func = func
        self.n = 0
    def __call__(self, *args, **kwargs):
        self.n += 1
        print(f'call {self.n}')
        return self.func(*args, **kwargs)

@CountCalls
def hello():
    return 'hi'

hello(); hello()     # 打印 call 1 / call 2
```

不加 `@wraps` 的话，`func.__name__` 会变成 `'wrapper'`，导致日志混乱、依赖函数名的框架（如 Flask 路由）出错。

---

## 六、lambda 与高阶函数

```python
lambda 参数: 返回值          # 只能写一个表达式，不能有多语句、不能写 return
```

适合当**短小的回调函数**（排序 key、map/filter 的参数），复杂逻辑请老老实实用 `def`。

```python
list(map(str, [1, 2, 3]))                  # => ['1', '2', '3']
list(filter(lambda x: x % 2, range(5)))    # => [1, 3]  保留奇数
from functools import reduce
reduce(lambda a, b: a + b, [1, 2, 3, 4])  # => 10  累积求和
sorted(['banana', 'apple'], key=len)        # => ['apple', 'banana']
```

### functools.partial 偏函数

把某些参数「冻结」，生成参数更少的新函数：

```python
from functools import partial
int2 = partial(int, base=2)     # 固定 base=2
print(int2('101'))              # => 5
print(int2('101', base=10))     # => 101  仍可覆盖
```

---

## 七、迭代器与生成器

- **可迭代对象 Iterable**：实现 `__iter__`（list、str、dict…）
- **迭代器 Iterator**：实现 `__iter__` + `__next__`，**只能遍历一次**
- **生成器 Generator**：带 `yield` 的函数，是迭代器的一种，**惰性计算、省内存**

### 生成器：yield 暂停 / 恢复 / yield from

```python
def fib():
    a, b = 0, 1
    while True:
        yield a            # 暂停并交出值
        a, b = b, a + b

g = fib()
print(next(g), next(g))   # => 0 1

def chain():
    yield from [1, 2, 3]  # 把另一个可迭代对象逐个产出
print(list(chain()))      # => [1, 2, 3]
```

生成器 vs 列表（省内存对比）：

```python
# 列表：先造出一千万个元素的完整列表，占大量内存
total = sum([x * x for x in range(10_000_000)])

# 生成器表达式：一次只算一个，内存几乎为 O(1)
total = sum(x * x for x in range(10_000_000))
```

### 迭代器协议：手写一个可迭代对象

```python
class MyRange:
    def __init__(self, n):
        self.n = n
        self.i = 0
    def __iter__(self):
        return self            # 返回自身的迭代器
    def __next__(self):
        if self.i >= self.n:
            raise StopIteration
        v = self.i
        self.i += 1
        return v

for x in MyRange(3):
    print(x)                  # => 0 1 2
```

### 递归与递归深度限制

递归就是函数调用自身。**Python 没有尾递归优化**，默认递归深度约 1000 层（`sys.getrecursionlimit()`），超过抛 `RecursionError`。

```python
import sys
print(sys.getrecursionlimit())   # => 1000

def fact(n):
    return 1 if n <= 1 else n * fact(n - 1)

def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fact(5), fib(10))          # => 120 55
```

> 深递归既可能 `RecursionError`，又可能因重复计算（如朴素 `fib`）非常慢。能用循环/迭代/动态规划就别用递归，或加 `@lru_cache` 缓存。

---

## 八、高频面试题

**Q1：Python 的参数传递是值传递还是引用传递？**

都不是，是**共享传参**：传的是对象的引用副本。不可变对象在函数内的"修改"实际是重新绑定，外部无感；可变对象被原地修改则外部可见。

**Q2：`*args` 和 `**kwargs` 的作用？**

允许函数接收不定数量的参数：`*args` 收集多余位置参数成**元组**，`**kwargs` 收集多余关键字参数成**字典**。常见于装饰器和"透传参数"的场景。

**Q3：什么是闭包？有什么用途？**

函数 + 其引用的外部变量。用途：数据隐藏（替代简单的类）、装饰器、回调函数携带状态、函数工厂。

**Q4：为什么 `[lambda: i for i in range(3)]` 全部返回 2？**

闭包的**延迟绑定**：`i` 在调用时才去外层作用域查找，那时循环已经结束。用默认参数 `lambda i=i: i` 立即绑定即可。

**Q5：手写一个计算函数运行时间的装饰器。**

```python
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        r = func(*args, **kwargs)
        print(f'{func.__name__} 耗时 {time.perf_counter() - start:.4f}s')
        return r
    return wrapper
```

**Q6：`@wraps` 有什么用？不加会怎样？**

把被装饰函数的 `__name__`、`__doc__`、`__module__` 等元信息复制到 wrapper 上。不加会导致函数名全部变成 `wrapper`，影响调试与依赖函数名的框架。

**Q7：生成器相比列表有什么优势？**

惰性计算，一次只产出一个值，**内存占用 O(1)**，还能表示无限序列。代价是只能遍历一次、不能随机访问。

**Q8：`yield` 和 `return` 的区别？**

`return` 结束函数并返回值，状态全部销毁；`yield` 暂停函数并交出值，下次 `next()` 从暂停处继续，局部变量全部保留。

**Q9：`global` 和 `nonlocal` 的区别？**

`global` 声明变量属于**模块全局**作用域；`nonlocal` 声明变量属于**外层嵌套函数**作用域（不能到全局）。只有需要"修改"变量时才需要声明，只读不需要。

**Q10：递归有什么缺点？**

Python **没有尾递归优化**，默认递归深度约 1000 层（`sys.getrecursionlimit()`），超过抛 `RecursionError`。深递归还可能栈溢出，能用循环就别用递归，或改为迭代 / 用栈模拟。

**Q11：如何给函数加缓存？**

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fib(n):
    return n if n < 2 else fib(n-1) + fib(n-2)
```

注意被缓存的**参数必须可哈希**。

**Q12：函数可以有多个返回值吗？**

语法上 `return a, b` 实际返回的是一个**元组**，调用方用 `x, y = f()` 自动解包。

**Q13：迭代器（iterator）和可迭代对象（iterable）的区别？**

可迭代对象实现 `__iter__`（如 list、str、dict），能用 `for` 遍历；迭代器额外实现 `__next__`，一次产出一个值、只能遍历一次。`iter(obj)` 把可迭代对象变成迭代器。

**Q14：装饰器叠放时执行顺序是怎样的？**

`@a @b @c def f` 等价于 `f = a(b(c(f)))`，离函数最近的 `c` 最先包装，`a` 在最外层最后包。

---

## 九、易错点

1. **默认参数用可变对象**：历史调用会互相污染
2. **闭包引用循环变量**：延迟绑定，务必用默认参数固化
3. **装饰器忘记 `@wraps`**：函数名和文档丢失
4. **生成器只能消费一次**：遍历完再遍历是空的，需要请重新创建
5. **`nonlocal` 不能用于全局变量**，也要求变量在外层已存在
6. **lambda 里不要写复杂逻辑**：可读性差且无法写多语句
7. **`map` / `filter` 返回迭代器**（Python 3），打印出来是 `<map object>`，需要 `list()` 转换
8. **可变默认参数 + 共享传参叠加**：`def f(x, cache={})` 在多次调用间泄漏状态
9. **递归深度**：深层递归会 `RecursionError`，注意改用迭代或加缓存
