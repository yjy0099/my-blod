---
title: Python 基础笔记 · 第 6 章：面向对象
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 面向对象, 魔术方法, 设计原则]
summary: 类属性与实例属性的陷阱、三种方法类型、私有化与 property、MRO 与 super 的协作机制、常用魔术方法，以及单例模式的两种写法。
---

## 一、类与实例

```python
class Person:
    species = 'Human'          # 类属性：所有实例共享

    def __init__(self, name):  # 初始化方法
        self.name = name       # 实例属性：每个实例独有

    def greet(self):           # 实例方法
        return f'Hi, I am {self.name}'
```

`self` 只是**约定俗成的名字**（换成别的也能跑，但别这么干），它代表当前实例对象。调用 `p.greet()` 实际是 `Person.greet(p)`。

### 面向过程 vs 面向对象

同一个需求的两种组织方式：面向过程是"**数据 + 一堆操作数据的函数**"，面向对象是"**把数据和行为封装在一起**"。

```python
# 面向过程：数据裸露，函数散落，改结构要改所有函数
def make_account(owner, balance):
    return {'owner': owner, 'balance': balance}

def deposit(acc, amt):
    acc['balance'] += amt        # 没人拦得住 acc['balance'] = -999

# 面向对象：状态被收进对象，入口收敛，校验有地方放
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    def deposit(self, amt):
        if amt <= 0:
            raise ValueError('金额必须为正')
        self._balance += amt
        return self._balance

a = Account('小明')
print(a.deposit(100))            # => 100
```

面向对象带来的四个能力：**封装**（隐藏细节、保护不变量）、**继承**（复用与扩展）、**多态**（同一接口不同实现）、**抽象**（对外只暴露概念）。判断标准很朴素：如果一组函数总是围着同一份数据转，就该建类了。

### self 的本质

`self` 不是关键字，只是**第一个位置参数的习惯命名**。`p.greet()` 之所以不用手动传，是因为通过实例访问函数时得到的是**绑定方法**（bound method），实例被自动塞进第一个参数。

```python
class P:
    def __init__(self, n):
        self.n = n
    def show(this):              # 换名字能跑，但不要这么写
        return this.n

p = P(1)
print(p.show())                  # => 1
print(P.show(p))                 # => 1    完全等价
print(p.show)                    # => <bound method P.show of ...>
print(P.show)                    # => <function P.show at ...>
print(p.show.__self__ is p)      # => True   绑定的实例就藏在这里
```

忘写 `self` 的经典报错：

```python
class Bad:
    def f():                     # 少了 self
        return 1
# Bad().f()   # TypeError: f() takes 0 positional arguments but 1 was given
```

### `__init__`、属性查找与 `__dict__`

`__init__` 不是构造器（那是 `__new__`），它只负责**给已创建好的实例填初始状态**，必须返回 `None`。

属性查找顺序（简化版）：**数据描述符 → 实例 `__dict__` → 类及其 MRO 的 `__dict__` → `__getattr__`**。

```python
class C:
    kind = 'c'
    def __init__(self):
        self.x = 1

c = C()
print(c.__dict__)          # => {'x': 1}          实例命名空间只有实例属性
print(C.__dict__['kind'])  # => c                 类属性在类命名空间
print(c.kind)              # => c                 实例找不到就往类上找
c.kind = 'mine'            # 赋值只写实例
print(c.kind, C.kind)      # => mine c
del c.kind
print(c.kind)              # => c                 删掉实例属性后又"透"到类属性

print(vars(c))             # => {'x': 1}          vars 等价 __dict__
print(hasattr(c, 'y'), getattr(c, 'y', '默认'))   # => False 默认
setattr(c, 'y', 2)
print(c.y)                 # => 2
print(isinstance(c, C), type(c) is C)             # => True True
```

### 类属性 vs 实例属性 ⚠️

```python
class Dog:
    tricks = []                # ❌ 可变类属性，所有实例共享！

    def __init__(self, name):
        self.name = name

a, b = Dog('A'), Dog('B')
a.tricks.append('sit')
b.tricks          # ['sit']   ← b 也中招了
```

规则：
- **查**属性时先找实例，找不到再往上找类
- **赋值** `self.x = ...` 只会创建/覆盖**实例属性**，不会改类属性
- 改类属性必须用 `类名.属性 = ...`

> 所以可变默认值（list/dict/set）**永远放在 `__init__` 里初始化**。

修正版与"计数器"这类类属性的正确用法：

```python
class Dog:
    count = 0                      # 不可变类属性做计数是合适的

    def __init__(self, name):
        self.name = name
        self.tricks = []           # ✅ 每个实例独立
        Dog.count += 1             # 必须用类名，写 self.count += 1 会变成实例属性

a, b = Dog('A'), Dog('B')
a.tricks.append('sit')
print(a.tricks, b.tricks)          # => ['sit'] []
print(Dog.count, a.count)          # => 2 2
a.count = 100                      # 这行只创建了实例属性，遮蔽了类属性
print(a.count, Dog.count)          # => 100 2
```

---

## 二、三种方法

| 类型 | 第一个参数 | 能访问 | 典型用途 |
| --- | --- | --- | --- |
| 实例方法 | `self`（实例） | 实例 + 类 | 常规业务逻辑 |
| `@classmethod` | `cls`（类） | 类 | 工厂方法、操作类属性 |
| `@staticmethod` | 无 | 都不自动传入 | 与类相关但不依赖状态的工具函数 |

```python
class Date:
    def __init__(self, y, m, d): ...

    @classmethod
    def from_string(cls, s):          # 工厂方法
        return cls(*map(int, s.split('-')))

    @staticmethod
    def is_valid(y, m, d):            # 工具函数
        return 1 <= m <= 12
```

### 为什么工厂方法必须用 `classmethod`

因为 `cls` 是**实际调用的那个类**，子类继承后自动返回子类实例；如果写死类名，子类调用就会退化成父类。

```python
class Base:
    def __init__(self, v):
        self.v = v

    @classmethod
    def create(cls, v):
        return cls(v)                 # cls 随调用方变化

    @staticmethod
    def create_bad(v):
        return Base(v)                # 写死了，子类拿不到自己

class Sub(Base):
    pass

print(type(Sub.create(1)).__name__)      # => Sub    正确
print(type(Sub.create_bad(1)).__name__)  # => Base   退化了
```

多种"命名构造器"是 `classmethod` 最常见的用法，解决了 Python 没有重载构造函数的问题：

```python
class Temp:
    def __init__(self, celsius):
        self.c = celsius

    @classmethod
    def from_fahrenheit(cls, f):
        return cls((f - 32) * 5 / 9)

    @classmethod
    def from_kelvin(cls, k):
        return cls(k - 273.15)

    def __repr__(self):
        return f'Temp({self.c:.1f})'

print(Temp.from_fahrenheit(212))     # => Temp(100.0)
print(Temp.from_kelvin(300))         # => Temp(26.9)
```

### 三者的调用与本质差异

```python
class T:
    def imethod(self): return ('instance', self)
    @classmethod
    def cmethod(cls): return ('class', cls)
    @staticmethod
    def smethod(): return 'static'

t = T()
print(t.imethod()[0], T.cmethod()[0], T.smethod())   # => instance class static
print(t.cmethod()[1] is T)          # => True   实例调类方法也拿到类
print(T.imethod(t)[0])              # => instance   显式传实例

# 类方法/静态方法都能被实例和类调用；实例方法只能由实例（或显式传参）调用
print(type(T.__dict__['smethod']))  # => <class 'staticmethod'>
print(type(T.__dict__['imethod']))  # => <class 'function'>
```

选择口诀：**要访问实例数据 → 实例方法；要访问类或返回本类实例 → 类方法；两者都不需要，只是逻辑归属 → 静态方法**（静态方法也可以直接写成模块级函数，放进类里主要为了组织代码）。

---

## 三、封装

Python 没有真正的私有，靠**约定 + 名称改写**：

```python
class A:
    def __init__(self):
        self.public = 1
        self._internal = 2      # 约定：内部使用，别从外部访问
        self.__secret = 3       # 名称改写 → _A__secret
```

`a.__secret` 会报 `AttributeError`，但 `a._A__secret` 依然能取到——**防君子不防小人**。

### name mangling 的真实规则

改写发生在**编译期**，规则是"类体内出现的 `__x` 一律替换成 `_类名__x`"（末尾有两个以上下划线的如 `__x__` 不改）。

```python
class A:
    def __init__(self):
        self.__v = 1
    def get(self):
        return self.__v          # 编译成 self._A__v

a = A()
print(a.__dict__)                # => {'_A__v': 1}
print(a._A__v)                   # => 1     依然可达
# print(a.__v)                   # AttributeError

class B(A):
    def __init__(self):
        super().__init__()
        self.__v = 99            # 存的是 _B__v，与父类互不干扰

b = B()
print(b.__dict__)                # => {'_A__v': 1, '_B__v': 99}
print(b.get())                   # => 1     父类方法仍读自己的 _A__v
```

`__` 的真正用途是**避免子类无意覆盖父类内部状态**，不是安全机制。工程习惯：对外接口用 `public`，内部实现用 `_single`，只有明确要防子类冲突时才用 `__double`。

### property：把方法伪装成属性

```python
class Circle:
    def __init__(self, r):
        self._r = r

    @property
    def radius(self):          # 读
        return self._r

    @radius.setter
    def radius(self, v):       # 写，可加校验
        if v <= 0: raise ValueError('半径必须为正')
        self._r = v

    @property
    def area(self):            # 只读计算属性
        return 3.14159 * self._r ** 2
```

好处：**对外接口不变的前提下，内部实现可以随时改**（比如从直接存值改成每次计算）。

三件套齐全的版本（含 `deleter` 与只读属性演示）：

```python
class Temp:
    def __init__(self, c):
        self._c = c

    @property
    def celsius(self):
        return self._c

    @celsius.setter
    def celsius(self, v):
        if v < -273.15:
            raise ValueError('低于绝对零度')
        self._c = v

    @celsius.deleter
    def celsius(self):
        print('清空温度')
        del self._c

    @property
    def fahrenheit(self):        # 只读派生属性，永远与 celsius 同步
        return self._c * 9 / 5 + 32

t = Temp(100)
print(t.fahrenheit)              # => 212.0
t.celsius = 0
print(t.fahrenheit)              # => 32.0
# t.fahrenheit = 50              # AttributeError: can't set attribute  只读
del t.celsius                    # => 清空温度
try:
    Temp(-300)
except ValueError as e:
    print(e)                     # => 低于绝对零度
```

配合缓存做惰性计算（`functools.cached_property`，3.8+）：

```python
from functools import cached_property

class Data:
    @cached_property
    def heavy(self):
        print('只算一次')
        return sum(range(10 ** 6))

d = Data()
print(d.heavy == d.heavy)        # => 只算一次 / True   第二次直接读实例 __dict__
```

### 描述符：property 的底层机制

只要一个类实现了 `__get__`/`__set__`/`__delete__` 中的任意一个，它的实例作为**类属性**时就是描述符，能拦截属性访问。`property`、`classmethod`、方法本身都是描述符。

```python
class Positive:
    """可复用的"必须为正数"字段校验器。"""
    def __set_name__(self, owner, name):     # 3.6+ 自动拿到属性名
        self.name = '_' + name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self                      # 通过类访问时返回描述符自身
        return getattr(obj, self.name)

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f'{self.name[1:]} 必须为正')
        setattr(obj, self.name, value)

class Rect:
    width = Positive()                       # 一次定义，多处复用
    height = Positive()

    def __init__(self, w, h):
        self.width, self.height = w, h

r = Rect(3, 4)
print(r.width * r.height)                    # => 12
try:
    r.width = -1
except ValueError as e:
    print(e)                                 # => width 必须为正
```

区别要点：同时定义了 `__get__` 和 `__set__` 的叫**数据描述符**，优先级**高于实例 `__dict__`**；只有 `__get__` 的是非数据描述符，优先级低于实例属性。`property` 属于数据描述符，这就是为什么它总能拦住赋值。

> 什么时候手写描述符？**同一套校验/转换逻辑要在多个属性、多个类上复用**时。只有一两个属性就用 `property`。

---

## 四、继承、super 与 MRO

```python
class Animal:
    def speak(self): return '...'

class Dog(Animal):
    def speak(self): return 'Woof'

class Cat(Animal):
    def speak(self): return 'Meow'

def make_it_speak(animal):     # 多态：不关心具体类型
    print(animal.speak())
```

### 继承的三件事：复用、扩展、重写

```python
class Base:
    def __init__(self, name):
        self.name = name
    def info(self):
        return f'Base({self.name})'
    def run(self):
        return 'base run'

class Child(Base):
    def __init__(self, name, age):
        super().__init__(name)         # 必须显式调用，否则父类状态不初始化
        self.age = age

    def info(self):                    # 重写 + 复用父类结果
        return super().info() + f' age={self.age}'

    def extra(self):                   # 扩展新能力
        return 'only child'

c = Child('x', 3)
print(c.info(), '|', c.run(), '|', c.extra())
# => Base(x) age=3 | base run | only child
print(Child.__bases__, issubclass(Child, Base), isinstance(c, Base))
# => (<class '__main__.Base'>,) True True
```

Python 中一切类都隐式继承 `object`，因此每个对象天生就有 `__str__`、`__eq__`、`__hash__`、`__dict__` 等默认实现。

### super() 与 MRO

`super()` 并不是"调用父类"，而是**按 MRO 顺序调用下一个类**——这是多重继承能正确工作的关键。

```python
class A:
    def f(self): print('A'); super().f()   # 协作式调用
class B:
    def f(self): print('B')
class C(A, B): pass

C().f()          # A \n B
C.__mro__        # (C, A, B, object)   —— C3 线性化结果
```

MRO 三原则：**子类优先于父类**；**多个父类按声明顺序**；**保持单调性**（不能有矛盾）。

菱形继承下才能真正看出 `super()` 的价值——它保证公共基类**只被调用一次**：

```python
class A:
    def __init__(self):
        print('A init'); super().__init__()
class B(A):
    def __init__(self):
        print('B init'); super().__init__()
class C(A):
    def __init__(self):
        print('C init'); super().__init__()
class D(B, C):
    def __init__(self):
        print('D init'); super().__init__()

D()
# => D init / B init / C init / A init      A 只执行一次
print([k.__name__ for k in D.__mro__])
# => ['D', 'B', 'C', 'A', 'object']
```

如果把 `super().__init__()` 换成硬编码 `A.__init__(self)`，`A` 会被执行两次，协作链断裂。**多继承体系里永远用 `super()`，且每个环节都要调用它。**

C3 线性化可以理解成：`L(D) = D + merge(L(B), L(C), [B, C])`，即在保持各父类自身顺序、且子类先于父类的前提下做归并。冲突时直接报错：

```python
class X: pass
class Y: pass
class Z1(X, Y): pass
# class Z2(Y, X): pass
# class Bad(Z1, Z2): pass
# TypeError: Cannot create a consistent method resolution order (MRO)
```

`super()` 还可以带参数 `super(类, 实例)`，用于跳过某一层（少见，但读源码会遇到）。

### 方法重写与多态、鸭子类型

```python
class Duck:
    def quack(self): return '嘎嘎'
class Person:
    def quack(self): return '我模仿：嘎嘎'

def make_quack(x):
    print(x.quack())              # 不检查类型，只要有 quack 就行

make_quack(Duck())                # => 嘎嘎
make_quack(Person())              # => 我模仿：嘎嘎   毫无继承关系也能用

# 让自定义类支持内置协议，也是鸭子类型的体现
class MyList:
    def __init__(self, *items): self.items = list(items)
    def __len__(self): return len(self.items)
    def __iter__(self): return iter(self.items)

ml = MyList(1, 2, 3)
print(len(ml), list(ml), sum(ml))     # => 3 [1, 2, 3] 6
```

Python 提倡 **EAFP（先做再处理异常）** 而不是 **LBYL（先查类型再做）**：

```python
def to_len(x):
    try:
        return len(x)                 # EAFP：直接用
    except TypeError:
        return 0

print(to_len('abc'), to_len(1))       # => 3 0
```

### 抽象基类 abc：给鸭子类型加约束

```python
from abc import ABC, abstractmethod

class Storage(ABC):
    @abstractmethod
    def save(self, key, value): ...

    @abstractmethod
    def load(self, key): ...

    def save_many(self, d):           # 抽象类可以有具体方法（模板方法模式）
        for k, v in d.items():
            self.save(k, v)

class MemStorage(Storage):
    def __init__(self): self.db = {}
    def save(self, key, value): self.db[key] = value
    def load(self, key): return self.db.get(key)

s = MemStorage()
s.save_many({'a': 1, 'b': 2})
print(s.load('a'))                    # => 1

class Broken(Storage):
    def save(self, k, v): pass        # 少实现了 load
try:
    Broken()
except TypeError as e:
    print(e)      # => Can't instantiate abstract class Broken with abstract method load
```

要点：**抽象基类不能实例化**，漏实现抽象方法在**实例化时**（而非定义时）报错；`abstractmethod` 可与 `property`、`classmethod` 组合。`collections.abc` 里的 `Iterable`、`Sequence`、`Mapping` 等是标准协议基类，继承它们能免费得到一堆混入方法。

### 混入类（Mixin）

只提供某一项能力、不独立使用的小类，靠多继承"拌"进去，是多继承在实践中的主要正当用途。

```python
import json

class JsonMixin:
    def to_json(self):
        return json.dumps(self.__dict__, ensure_ascii=False)

class ReprMixin:
    def __repr__(self):
        return f'{type(self).__name__}({self.__dict__})'

class User(JsonMixin, ReprMixin):     # Mixin 放前面，便于覆盖
    def __init__(self, name, age):
        self.name, self.age = name, age

u = User('小明', 18)
print(u.to_json())                    # => {"name": "小明", "age": 18}
print(u)                              # => User({'name': '小明', 'age': 18})
```

### 面向对象设计原则 SOLID

| 原则 | 一句话 | Python 里的体现 |
| --- | --- | --- |
| S 单一职责 | 一个类只有一个变化的理由 | 别把"取数据 + 算逻辑 + 发邮件"塞一个类 |
| O 开闭原则 | 对扩展开放，对修改关闭 | 新增子类/策略函数，而不是改 `if-elif` 长链 |
| L 里氏替换 | 子类必须能替换父类而不出错 | 子类别收窄参数、别抛父类没声明的异常 |
| I 接口隔离 | 接口要小而专一 | 拆多个 Mixin/协议，别做上帝抽象类 |
| D 依赖倒置 | 依赖抽象而非具体实现 | 构造函数注入依赖，靠鸭子类型/ABC 约定 |

```python
# 开闭 + 依赖倒置：加一种支付方式不用改 checkout
class Alipay:
    def pay(self, amt): return f'支付宝支付 {amt}'
class WeChatPay:
    def pay(self, amt): return f'微信支付 {amt}'

def checkout(channel, amt):        # 依赖"有 pay 方法"这个抽象
    return channel.pay(amt)

print(checkout(Alipay(), 10))      # => 支付宝支付 10
print(checkout(WeChatPay(), 20))   # => 微信支付 20
```

> 另一条比 SOLID 更常用的经验：**组合优于继承**。继承是强耦合的"是一个"，组合是松耦合的"有一个"，能用属性持有对象解决的就不要建继承树。

---

## 五、常用魔术方法

| 方法 | 触发场景 |
| --- | --- |
| `__init__` / `__new__` | 初始化 / 创建实例 |
| `__str__` / `__repr__` | `print()` / 交互式回显（调试用 `__repr__`） |
| `__format__` | `format(obj, spec)` / f-string 里的 `:spec` |
| `__len__` / `__getitem__` / `__setitem__` / `__delitem__` | `len(obj)` / `obj[i]` 读写删 |
| `__contains__` | `x in obj` |
| `__iter__` / `__next__` | 让对象可迭代 |
| `__call__` | 让实例像函数一样被调用 |
| `__eq__` / `__hash__` | `==` 比较 / 可哈希（一起改） |
| `__lt__` `__le__` `__gt__` `__ge__` | 大小比较、排序 |
| `__add__` `__sub__` `__mul__` `__iadd__` | 运算符重载 |
| `__bool__` | `if obj` 的真值判断 |
| `__enter__` / `__exit__` | `with` 上下文管理 |
| `__getattr__` / `__getattribute__` / `__setattr__` | 访问/设置属性、属性拦截 |
| `__slots__` | 限定属性、省内存 |
| `__del__` | 对象被回收时（不保证时机，别当析构用） |

```python
class Card:
    def __init__(self, rank, suit):
        self.rank, self.suit = rank, suit
    def __repr__(self):
        return f'Card({self.rank!r}, {self.suit!r})'
    def __eq__(self, other):
        return (self.rank, self.suit) == (other.rank, other.suit)
    def __hash__(self):
        return hash((self.rank, self.suit))
```

> 定义了 `__eq__` 后，`__hash__` 会变成 `None`（对象变为不可哈希）。要放进 set / 当 dict 的 key，必须同时定义 `__hash__`。

### `__str__` vs `__repr__`

`__str__` 面向用户，`__repr__` 面向开发者。**只写一个就写 `__repr__`**，因为 `str()` 会回退到它，反之不成立。

```python
class P:
    def __init__(self, x): self.x = x
    def __repr__(self): return f'P(x={self.x!r})'    # 明确、可复现
    def __str__(self): return f'点{self.x}'           # 友好

p = P(1)
print(p)                 # => 点1        print 用 __str__
print(str(p), repr(p))   # => 点1 P(x=1)
print([p])               # => [P(x=1)]   容器打印内部元素永远用 repr！
print(f'{p} / {p!r}')    # => 点1 / P(x=1)
```

**容器只用 `repr`** 这条规则很重要：调试时看到列表里一堆 `<obj at 0x...>`，就是漏了 `__repr__`。

### `__eq__` 与 `__hash__` 必须成对

契约：**相等的对象必须有相同的哈希值**（反之不必）。

```python
class Point:
    def __init__(self, x, y): self.x, self.y = x, y
    def __repr__(self): return f'Point({self.x},{self.y})'
    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented          # 交给对方判断，别直接 False
        return (self.x, self.y) == (other.x, other.y)
    def __hash__(self):
        return hash((self.x, self.y))      # 用不可变字段组成的元组

a, b = Point(1, 2), Point(1, 2)
print(a == b, a is b)            # => True False
print(len({a, b}))               # => 1    去重成功
print({a: 'v'}[b])               # => v    可作 key 且能互相命中
```

> 如果对象是**可变**的，就不要实现 `__hash__`（放进 set 后改字段会导致查不到）。这也是 `list`/`dict` 不可哈希的原因。

### 比较与排序

实现 `__lt__` 就能被 `sorted`/`min`/`max` 使用；要全套比较用 `functools.total_ordering` 自动补齐。

```python
from functools import total_ordering

@total_ordering
class Ver:
    def __init__(self, s): self.parts = tuple(map(int, s.split('.')))
    def __repr__(self): return 'v' + '.'.join(map(str, self.parts))
    def __eq__(self, o): return self.parts == o.parts
    def __lt__(self, o): return self.parts < o.parts

vs = [Ver('1.10.0'), Ver('1.2.0'), Ver('2.0.0')]
print(sorted(vs))                     # => [v1.2.0, v1.10.0, v2.0.0]
print(max(vs), Ver('1.2.0') >= Ver('1.2.0'))   # => v2.0.0 True
```

### 容器协议：len / getitem / iter

只要实现 `__len__` + `__getitem__`，对象就能索引、切片、迭代、`in`、反转——这就是"协议优于继承"。

```python
class Deck:
    def __init__(self):
        self.cards = [f'{r}{s}' for s in 'SH' for r in 'A23']

    def __len__(self):
        return len(self.cards)

    def __getitem__(self, i):
        return self.cards[i]           # 支持 int 也支持 slice

    def __setitem__(self, i, v):
        self.cards[i] = v

    def __contains__(self, v):         # 不写也能用 in（会退化成遍历），写了更快
        return v in self.cards

d = Deck()
print(len(d), d[0], d[:2])            # => 6 AS ['AS', '2S']
print('3H' in d)                      # => True
for c in d[:3]:
    pass                              # 有 __getitem__ 就可迭代
d[0] = 'KS'
print(d[0])                           # => KS
print(list(reversed(d))[0])           # => 3H
```

真正的迭代器协议是 `__iter__` 返回自身 + `__next__` 产出元素；用生成器写更省事：

```python
class Count:
    def __init__(self, n): self.n = n
    def __iter__(self):
        for i in range(self.n):
            yield i                    # 生成器函数自动满足迭代器协议

print(list(Count(3)))                  # => [0, 1, 2]
```

### `__call__`：可调用对象

```python
class Multiplier:
    def __init__(self, k): self.k = k
    def __call__(self, x): return x * self.k

double = Multiplier(2)
print(double(5), callable(double))     # => 10 True
print(list(map(double, [1, 2, 3])))    # => [2, 4, 6]
```

比闭包的优势：**能携带可读写的状态、可被序列化、可加方法**（计数器、带状态的装饰器、模型推理器常这么写）。

### 运算符重载

```python
class Vec:
    def __init__(self, x, y): self.x, self.y = x, y
    def __repr__(self): return f'Vec({self.x}, {self.y})'
    def __add__(self, o): return Vec(self.x + o.x, self.y + o.y)
    def __sub__(self, o): return Vec(self.x - o.x, self.y - o.y)
    def __mul__(self, k): return Vec(self.x * k, self.y * k)
    def __rmul__(self, k): return self * k          # 支持 3 * v
    def __neg__(self): return Vec(-self.x, -self.y)
    def __abs__(self): return (self.x ** 2 + self.y ** 2) ** 0.5
    def __bool__(self): return bool(self.x or self.y)

v = Vec(1, 2) + Vec(3, 4)
print(v, v * 2, 3 * Vec(1, 1), -v)     # => Vec(4, 6) Vec(8, 12) Vec(3, 3) Vec(-4, -6)
print(abs(Vec(3, 4)), bool(Vec(0, 0))) # => 5.0 False
```

> `__iadd__`（`+=`）如果不实现，会退化成 `a = a + b`（生成新对象）。可变容器类实现 `__iadd__` 做原地修改并 `return self`。

### 上下文管理：`__enter__` / `__exit__`

```python
import time

class Timer:
    def __enter__(self):
        self.t = time.perf_counter()
        return self                  # 返回值给 as 后面的变量

    def __exit__(self, exc_type, exc_val, tb):
        self.cost = time.perf_counter() - self.t
        print(f'耗时 {self.cost:.3f}s')
        return False                 # 返回 True 会"吞掉"异常，一般返回 False

with Timer() as t:
    sum(range(10 ** 5))
# => 耗时 0.00Xs

# 等价的简写：contextlib
from contextlib import contextmanager

@contextmanager
def opened(path):
    f = open(path, 'w', encoding='utf-8')
    try:
        yield f                      # yield 前是 enter，后是 exit
    finally:
        f.close()
```

关键点：**无论有没有异常，`__exit__` 一定执行**，因此适合做资源释放、加解锁、事务提交回滚。

### 属性拦截：`__getattr__` / `__getattribute__` / `__setattr__`

```python
class Conf:
    def __init__(self, d): self._d = d

    def __getattr__(self, name):           # 仅在常规查找失败时调用
        try:
            return self._d[name]
        except KeyError:
            raise AttributeError(name) from None

    def __setattr__(self, name, value):    # 任何赋值都会走这里
        if name != '_d' and not name.startswith('_'):
            self._d[name] = value          # 转存到字典
        else:
            super().__setattr__(name, value)   # 必须用 super，否则无限递归

c = Conf({'host': 'localhost'})
print(c.host)                              # => localhost
c.port = 8080
print(c._d)                                # => {'host': 'localhost', 'port': 8080}
try:
    c.missing
except AttributeError as e:
    print('无此配置:', e)                   # => 无此配置: missing
```

区别一定要记牢：**`__getattr__` 只在"找不到"时兜底**（用于代理、懒加载、动态属性）；`__getattribute__` 拦截**所有**属性访问（极易写出无限递归，非必要不碰）。

### `__slots__`：省内存的原理

普通实例用 `__dict__`（哈希表）存属性，灵活但占内存。`__slots__` 改用**固定槽位的数组 + 描述符**，省掉字典开销。

```python
import sys

class Normal:
    def __init__(self, x, y): self.x, self.y = x, y

class Slotted:
    __slots__ = ('x', 'y')
    def __init__(self, x, y): self.x, self.y = x, y

n, s = Normal(1, 2), Slotted(1, 2)
print(sys.getsizeof(n) + sys.getsizeof(n.__dict__))   # => 明显更大
print(sys.getsizeof(s))                                # => 明显更小
print(hasattr(s, '__dict__'))                          # => False

n.z = 3                        # 普通类可以随便加
try:
    s.z = 3
except AttributeError as e:
    print(e)                   # => 'Slotted' object has no attribute 'z'
```

代价与注意点：不能动态加属性；不能有类属性与槽同名；**子类没写 `__slots__` 就会重新长出 `__dict__`**，优化归零；多继承中多个父类都有非空 `__slots__` 会报错；需要弱引用要显式加 `'__weakref__'`。适用场景是**海量小对象**（几十万级别的数据点、节点）。

### 深浅拷贝与对象

```python
import copy

class Node:
    def __init__(self, name, tags):
        self.name, self.tags = name, tags
    def __repr__(self):
        return f'Node({self.name}, {self.tags})'

a = Node('a', ['x'])
b = a                        # 1) 赋值：同一个对象，两个名字
c = copy.copy(a)             # 2) 浅拷贝：新对象，属性仍指向同一个 list
d = copy.deepcopy(a)         # 3) 深拷贝：递归复制所有可变内容

a.tags.append('y')
print(b.tags, c.tags, d.tags)      # => ['x', 'y'] ['x', 'y'] ['x']
print(a is b, a is c, a.tags is c.tags)   # => True False True

# 自定义拷贝行为
class Cached:
    def __init__(self, data):
        self.data = data
        self.cache = {}          # 不该被复制的运行时缓存
    def __deepcopy__(self, memo):
        new = Cached(copy.deepcopy(self.data, memo))
        return new               # 有意丢弃 cache

print(copy.deepcopy(Cached([1])).cache)   # => {}
```

要点：**浅拷贝只复制一层**，`list[:]`、`dict.copy()`、`copy.copy()` 都是浅的；深拷贝用 `memo` 字典处理循环引用；不可变对象（`int`/`str`/`tuple`）拷贝往往直接返回原对象。

---

## 六、`__new__` 与单例模式

`__new__` 负责**创建**对象（返回实例），`__init__` 负责**初始化**（不返回值）。

```python
class Singleton:
    _instance = None
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

更 Pythonic 的写法是用装饰器或元类，但 `__new__` 版本最容易理解。**注意它并不是线程安全的**，多线程场景需加锁。

### `__new__` 的执行链路

`Cls(*args)` 实际做两步：`obj = Cls.__new__(Cls, *args)`；若 `isinstance(obj, Cls)` 则调用 `obj.__init__(*args)`。

```python
class Demo:
    def __new__(cls, *a, **kw):
        print('1. new')
        return super().__new__(cls)      # 忘了 return 就会得到 None！
    def __init__(self, v):
        print('2. init')
        self.v = v

d = Demo(1)                              # => 1. new / 2. init
print(d.v)                               # => 1

class NoReturn:
    def __new__(cls): print('new'); # 没有 return
    def __init__(self): print('init 不会执行')
print(NoReturn())                        # => new / None
```

继承不可变类型时必须用 `__new__`（`__init__` 里已经改不动了）：

```python
class PosInt(int):
    def __new__(cls, v):
        if v <= 0:
            raise ValueError('必须为正')
        return super().__new__(cls, v)

x = PosInt(5)
print(x + 1, type(x).__name__)           # => 6 PosInt
```

### 单例的四种实现

```python
import threading, functools

# 1) __new__ + 双重检查锁（线程安全）
class S1:
    _inst = None
    _lock = threading.Lock()
    def __new__(cls):
        if cls._inst is None:
            with cls._lock:
                if cls._inst is None:            # 二次检查，避免重复创建
                    cls._inst = super().__new__(cls)
        return cls._inst

# 2) 装饰器（最简洁，可复用）
def singleton(cls):
    insts = {}
    @functools.wraps(cls)
    def wrapper(*a, **kw):
        if cls not in insts:
            insts[cls] = cls(*a, **kw)
        return insts[cls]
    return wrapper

@singleton
class Config:
    def __init__(self): self.d = {}

# 3) 元类（最"正统"，控制类的调用行为）
class SingletonMeta(type):
    _insts = {}
    def __call__(cls, *a, **kw):
        if cls not in cls._insts:
            cls._insts[cls] = super().__call__(*a, **kw)
        return cls._insts[cls]

class Logger(metaclass=SingletonMeta):
    pass

# 4) 模块本身就是单例（Python 最推荐的方式）
#    把配置写成模块级变量/函数，import 天然只初始化一次

print(S1() is S1(), Config() is Config(), Logger() is Logger())   # => True True True
```

> 注意 `__new__` 版单例的一个坑：**`__init__` 每次调用都会重新执行**，会把已有状态覆盖掉。要么在 `__init__` 里加"已初始化"标志，要么改用装饰器/元类方案。

### 元类：类的类

`type` 有两副面孔：一个参数时查类型，三个参数时**动态创建类**。类的类型就是元类，默认是 `type`。

```python
print(type(1), type(int), type(type))          # => int type type

# 三参数 type：动态造类，等价于 class Foo: bar = 1
Foo = type('Foo', (object,), {'bar': 1, 'hi': lambda self: 'hi'})
f = Foo()
print(Foo.bar, f.hi(), type(Foo))              # => 1 hi <class 'type'>

# 自定义元类：在"类被创建时"介入（注意 Python 3 用 metaclass=，不是 __metaclass__）
class AutoRepr(type):
    def __new__(mcls, name, bases, ns):
        if '__repr__' not in ns:
            ns['__repr__'] = lambda self: f'<{name} {self.__dict__}>'
        return super().__new__(mcls, name, bases, ns)

class User(metaclass=AutoRepr):
    def __init__(self, n): self.n = n

print(User('小明'))                             # => <User {'n': '小明'}>
```

`type.__new__` 造类，元类的 `__call__` 控制"实例化过程"，`__init_subclass__`（3.6+）能以更轻量的方式做子类注册。ORM（Django/SQLAlchemy 模型）、`abc`、`dataclass` 背后都有这套机制。

> 面试口径：**元类是"类的模板"，用于批量改造类的创建行为；99% 的需求用装饰器、`__init_subclass__` 或继承就够了**，别为了炫技上元类。

---

## 七、dataclass：告别样板代码

```python
from dataclasses import dataclass

@dataclass(order=True, frozen=True)   # 可排序、不可变（可哈希）
class Point:
    x: int
    y: int

p = Point(1, 2)
p == Point(1, 2)      # True   自动生成 __eq__
sorted([Point(2,1), Point(1,2)])   # 自动生成 __lt__
```

自动生成 `__init__`、`__repr__`、`__eq__`；`frozen=True` 还能生成 `__hash__`。写数据载体类时首选。

### 参数与 field 详解

```python
from dataclasses import dataclass, field, asdict, astuple, replace
from typing import List

@dataclass
class Task:
    title: str                                  # 必填
    done: bool = False                          # 有默认值的必须放后面
    tags: List[str] = field(default_factory=list)   # 可变默认值必须用工厂！
    _cache: dict = field(default_factory=dict, repr=False, compare=False)
    priority: int = field(default=0, metadata={'unit': '级'})

    def __post_init__(self):                    # 初始化后钩子：校验/派生字段
        self.title = self.title.strip()
        if self.priority < 0:
            raise ValueError('优先级不能为负')

t = Task('  写笔记 ', tags=['py'])
print(t)                    # => Task(title='写笔记', done=False, tags=['py'], priority=0)
print(asdict(t)['tags'], astuple(t)[0])         # => ['py'] 写笔记
print(replace(t, done=True).done)               # => True   基于已有对象改几个字段
```

> `tags: list = []` 会直接抛 `ValueError: mutable default`——dataclass 主动帮你拦住了第一节讲的可变默认值陷阱，必须写 `field(default_factory=list)`。

常用装饰器参数：

| 参数 | 作用 |
| --- | --- |
| `init=True` | 生成 `__init__` |
| `repr=True` | 生成 `__repr__` |
| `eq=True` | 生成 `__eq__` |
| `order=False` | 生成 `__lt__` 等四个比较方法（按字段顺序） |
| `frozen=False` | 只读实例，赋值抛 `FrozenInstanceError`，并生成 `__hash__` |
| `slots=False` | 3.10+，自动生成 `__slots__` |
| `kw_only=False` | 3.10+，全部参数改为关键字传入 |

```python
from dataclasses import dataclass, FrozenInstanceError

@dataclass(frozen=True, slots=True)
class Coord:
    x: int
    y: int

c = Coord(1, 2)
print({c: 'origin'}[Coord(1, 2)])       # => origin   frozen → 可哈希
try:
    c.x = 9
except FrozenInstanceError as e:
    print('不可变:', type(e).__name__)   # => 不可变: FrozenInstanceError
```

### 和其他"数据类"方案怎么选

| 方案 | 特点 | 适用 |
| --- | --- | --- |
| `tuple` / `dict` | 零成本，无语义 | 临时数据 |
| `namedtuple` | 不可变、可解包、省内存 | 只读记录、返回多值 |
| `@dataclass` | 标准库、可变可冻结、支持默认值和方法 | 绝大多数业务实体 |
| 手写类 | 完全可控 | 有复杂不变量/自定义构造逻辑 |
| `pydantic` | 运行时类型校验、序列化 | 外部输入（API 请求体、配置） |

```python
from collections import namedtuple
Pt = namedtuple('Pt', 'x y')
p = Pt(1, 2)
x, y = p                        # 可解包
print(p.x, p._asdict(), p._replace(x=9))
# => 1 {'x': 1, 'y': 2} Pt(x=9, y=2)
```

> 一句话选型：**要不可变小记录用 `namedtuple`，要业务实体用 `dataclass`，要校验外部数据用 `pydantic`。** 注意 dataclass 的类型注解**不做任何运行时检查**，`Task(title=123)` 照样能建出来。

---

## 八、高频面试题

**Q1：类属性和实例属性的区别？**

类属性属于类，被所有实例共享；实例属性属于单个对象。查找时先实例后类，**赋值只会创建实例属性**。可变类属性（如 list）被任一实例修改会影响全部，这是最常见的坑。修改类属性必须用 `类名.属性 = x`。

**Q2：`__new__` 和 `__init__` 的区别？**

`__new__` 是静态方法，负责**创建并返回**实例（是真正的"构造器"）；`__init__` 负责**初始化**已有实例，不返回值。实现单例、不可变子类（如继承 `int`/`tuple`）时需要重写 `__new__`。`__new__` 忘记 `return` 会导致 `__init__` 不执行、构造出 `None`。

**Q3：`@classmethod`、`@staticmethod`、实例方法的区别？**

实例方法接收 `self`，能访问实例和类；类方法接收 `cls`，只能访问类，常用于工厂方法（`cls` 保证子类返回子类实例）；静态方法两者都不接收，只是"放在类里的普通函数"，用于逻辑上属于该类的工具方法。

**Q4：Python 如何实现多态？**

主要靠**鸭子类型**——不检查类型继承关系，只要对象有对应方法就能用。配合抽象基类（`abc.ABC` + `@abstractmethod`）可以在需要时做接口约束。Python 没有 Java 那种基于重载/静态类型的多态。

**Q5：什么是 MRO？`super()` 到底调用谁？**

MRO（方法解析顺序）用 C3 线性化算法生成，可通过 `类名.__mro__` 查看。`super()` 调用的是 **MRO 中的下一个类**，不一定是"父类"——这正是多重继承下协作式调用能正确工作的原因，也保证了菱形继承中公共基类只被执行一次。

**Q6：`__str__` 和 `__repr__` 的区别？**

`__str__` 面向用户（`print()` 时调用，追求可读）；`__repr__` 面向开发者（交互式回显，追求**明确**，理想情况是 `eval(repr(obj)) == obj`）。只写一个就写 `__repr__`，`print` 会回退到它。**容器打印内部元素永远用 `repr`。**

**Q7：Python 的私有属性是怎么实现的？**

没有真私有。双下划线开头的属性会在编译期被**名称改写**为 `_类名__属性名`，只是换了个名字，仍可通过 `obj._类名__属性` 访问。单下划线是纯约定。`__` 的真实价值是防止子类意外覆盖父类内部状态。

**Q8：`property` 的作用？**

把方法包装成属性访问形式，可以在不改变调用方式的前提下加入**校验、惰性计算、只读控制**。它本质是一个**数据描述符**，优先级高于实例 `__dict__`，所以能拦住赋值。是 Python 推荐的 getter/setter 写法。

**Q9：什么是鸭子类型？**

"如果它走起来像鸭子、叫起来像鸭子，那它就是鸭子。" 关注对象的**行为（有什么方法）**而非类型，是 Python 多态的核心。配套风格是 EAFP：直接调用并捕获异常，而不是先 `isinstance` 检查。

**Q10：`__slots__` 有什么用？**

限制实例只能拥有指定属性，不再生成 `__dict__`，**显著节省内存**并略微加快属性访问。适合需要创建海量简单对象的场景；代价是不能动态加属性，且**子类未定义 `__slots__` 会重新长出 `__dict__`**，优化失效。

**Q11：`__eq__` 和 `__hash__` 为什么要一起写？**

哈希容器（`set`/`dict`）先比哈希值分桶再用 `==` 确认，若相等的对象哈希不同就会重复存入。因此 Python 规定：定义 `__eq__` 后 `__hash__` 自动置 `None`（对象不可哈希），需要哈希就必须手动实现，且用与 `__eq__` 相同的不可变字段。可变对象干脆别实现 `__hash__`。

**Q12：深拷贝和浅拷贝的区别？**

浅拷贝（`copy.copy`、`list[:]`、`dict.copy()`）只复制最外层容器，内部元素仍是共享引用；深拷贝（`copy.deepcopy`）递归复制所有层级，并用 `memo` 处理循环引用。可自定义 `__copy__`/`__deepcopy__` 控制行为（比如跳过缓存和连接对象）。

**Q13：描述符是什么？和 `property` 什么关系？**

实现了 `__get__`/`__set__`/`__delete__` 的类，作为**类属性**时能拦截属性访问。`property`、`classmethod`、`staticmethod`、函数（绑定方法）都是描述符实现的。同时有 `__get__`+`__set__` 的是数据描述符，优先级高于实例字典。多个属性要复用同一套校验逻辑时手写描述符，否则用 `property`。

**Q14：元类是什么？什么时候需要？**

元类是"创建类的类"，默认为 `type`。类定义时由元类的 `__new__`/`__init__` 加工，实例化时由元类的 `__call__` 控制。典型用途是 ORM 字段收集、接口强制、自动注册。绝大多数场景用类装饰器或 `__init_subclass__` 更简单。

**Q15：`@dataclass` 帮你做了什么？`frozen=True` 有什么效果？**

按类型注解自动生成 `__init__`、`__repr__`、`__eq__`（可选 `__lt__` 等）。`frozen=True` 让实例只读（赋值抛 `FrozenInstanceError`）并生成 `__hash__`，因此能进 `set`/作 `dict` 键。可变默认值必须写 `field(default_factory=list)`。

**Q16：多继承的问题与替代方案？**

问题是命名冲突、MRO 复杂、初始化链容易断。替代方案：**组合优于继承**（持有对象而非继承）、只用职责单一的 Mixin、用抽象基类/协议约定接口。

**Q17：`__getattr__` 和 `__getattribute__` 区别？**

`__getattribute__` 拦截**所有**属性访问（含存在的属性），实现不当极易无限递归；`__getattr__` 只在常规查找**失败后**兜底，用于代理转发、懒加载、动态配置。日常只写 `__getattr__`。

**Q18：如何用类实现上下文管理器？**

实现 `__enter__`（返回给 `as` 的对象）和 `__exit__(exc_type, exc_val, tb)`。`__exit__` 返回 `True` 会吞掉异常，一般返回 `False`/`None`。简单场景用 `contextlib.contextmanager` 装饰生成器函数更省事。

---

## 九、易错点

1. **可变类属性共享**：list/dict 类属性一定要搬到 `__init__`
2. **重新定义了 `__eq__` 却忘了 `__hash__`**：对象会变成不可哈希，无法进 set
3. **`super()` 不是"调父类"**：多重继承下务必用 `super()` 而不是直接写父类名，否则协作链会断
4. **`__init__` 不能返回值**：返回非 `None` 会抛 `TypeError`
5. **默认参数 + 继承**：子类 `__init__` 忘记调 `super().__init__()` 会导致父类状态没初始化
6. **`__slots__` 与继承**：父类没定义 `__slots__` 时，子类定义了也省不了内存
7. **`self.count += 1` 改类属性**：这行会新建实例属性并遮蔽类属性，必须写 `类名.count += 1`
8. **`__new__` 忘记 `return`**：构造结果是 `None`，`__init__` 也不会被调用
9. **单例用 `__new__` 时 `__init__` 重复执行**：每次调用都会重置状态，需加初始化标志
10. **`__setattr__` 里直接 `self.x = v`**：无限递归，必须走 `super().__setattr__`
11. **忘写 `__repr__`**：调试时列表里全是 `<obj at 0x...>`，定位问题效率骤降
12. **dataclass 用可变默认值**：`tags: list = []` 直接报错，要用 `field(default_factory=list)`
13. **以为类型注解会校验**：dataclass/注解都是纯声明，运行时不检查，需要校验请用 `pydantic` 或 `__post_init__`
14. **给可变对象实现 `__hash__`**：放进 set 后改字段就再也查不到了
15. **滥用继承表达"有一个"关系**：`Car(Engine)` 是错的，应该 `self.engine = Engine()`
16. **`abstractmethod` 不写在 `ABC` 子类里**：普通类的 `@abstractmethod` 不生效，照样能实例化
