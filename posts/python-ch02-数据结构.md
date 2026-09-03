---
title: Python 基础笔记 · 第 2 章：数据结构
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 数据结构, 容器, 深浅拷贝]
summary: list / tuple / dict / set 四大容器的常用方法、时间复杂度、底层实现要点，切片与推导式的正确用法，深浅拷贝与可变默认参数陷阱，以及 12 道高频面试题。
---

## 一、四大容器总览

| 容器 | 可变 | 有序 | 元素要求 | 典型场景 |
| --- | --- | --- | --- | --- |
| `list` | ✅ | ✅ | 无 | 需要增删改的有序序列 |
| `tuple` | ❌ | ✅ | 无 | 固定结构、作 dict 的 key |
| `dict` | ✅ | ✅（3.7+） | key 必须**可哈希** | 键值映射 |
| `set` | ✅ | ❌ | 元素必须**可哈希** | 去重、集合运算 |

> **可哈希（hashable）**：对象在其生命周期内哈希值不变，且能比较相等。实现 `__hash__` 与 `__eq__` 且 `a == b` 时 `hash(a) == hash(b)`。可变容器（list/dict/set）都不可哈希。

### 数值基础类型补充

容器装的元素往往来自内置数值类型，这里补几个面试易考点：

- **int 任意精度**：Python 的整数没有大小上限，不会溢出。
- **进制转换**：`bin()` / `oct()` / `hex()`，字面量前缀 `0b` / `0o` / `0x`；`int.bit_length()` 看二进制位数。
- **float 精度**：二进制浮点无法精确表示某些十进制小数，`0.1 + 0.2 != 0.3`；精确场景用 `decimal.Decimal` 或 `fractions.Fraction`。
- **bool 是 int 的子类**：`True == 1`、`False == 0`，所以 `sum([True, True]) == 2`。

```python
x = 10 ** 100          # 任意大整数，不会溢出
print(bin(10), oct(10), hex(10))   # => 0b1010 0o12 0xa
print(0b1010, 0o17, 0xFF)          # => 10 15 255
print(x.bit_length())              # => 333（二进制位数）

print(0.1 + 0.2)                   # => 0.30000000000000004
print(0.1 + 0.2 == 0.3)            # => False
from decimal import Decimal
print(Decimal('0.1') + Decimal('0.2') == Decimal('0.3'))  # => True
from fractions import Fraction
print(Fraction(1, 3) + Fraction(1, 6))   # => 1/2

print(isinstance(True, int))       # => True
print(True == 1, False == 0)       # => True True
print(sum([True, True, False]))    # => 2
```

### 序列类型的通用操作

`list` / `tuple` / `str` / `bytes` 都是序列，共享一套操作：索引、切片、拼接、重复、成员判断、长度/最值。

```python
s = [10, 20, 30]
print(s[0])        # => 10   正向索引
print(s[-1])       # => 30   负向索引（从末尾）
print(s[1:3])      # => [20, 30]   切片含头不含尾
print(s[::2])      # => [10, 30]   带步长
print(s + [40])    # => [10, 20, 30, 40]   拼接（生成新序列）
print(s * 2)       # => [10, 20, 30, 10, 20, 30]   重复
print(20 in s, len(s), max(s), min(s))   # => True 3 30 10
```

### bytes 与 bytearray（二进制）

`str` 是「文本」，存的是 Unicode 字符；`bytes` 是「字节」，存 0~255 的整数序列。两者通过编码/解码互转。

```python
s = '中文'
bs = s.encode('utf-8')     # str -> bytes
print(bs)                  # => b'\xe4\xb8\xad\xe6\x96\x87'
print(bs.decode('utf-8'))  # => 中文   bytes -> str
ba = bytearray(b'abc')     # 可变的字节序列
ba[0] = 65                 # 可原地改
print(ba)                  # => bytearray(b'Abc')
```

### collections 模块补充容器

标准库 `collections` 提供几个高频实用容器，面试常问：

| 容器 | 用途 |
| --- | --- |
| `deque` | 双端队列，两端增删都是 O(1) |
| `Counter` | 计数，统计频次 |
| `namedtuple` | 带名字的元组 |
| `defaultdict` | 访问缺失 key 自动给默认值 |
| `OrderedDict` | 保序字典（3.7+ 普通 dict 已保序，它额外提供 `move_to_end` 等） |

```python
from collections import deque, Counter, namedtuple, defaultdict
dq = deque([1, 2, 3])
dq.appendleft(0); dq.popleft()        # O(1) 双端操作
c = Counter('abracadabra')
print(c.most_common(2))              # => [('a', 5), ('b', 2)]
dd = defaultdict(list)
dd['x'].append(1)                     # 缺失 key 自动生成 []
print(dd['x'])                       # => [1]
```

---

## 二、list：动态数组

### 核心特性

底层是**动态数组**，扩容时会超额分配空间，所以 `append` 是**均摊 O(1)**。

| 操作 | 时间复杂度 |
| --- | --- |
| `append` / `pop()`（尾部） | O(1) 均摊 |
| `insert(0, x)` / `pop(0)` | O(n) |
| `x in lst` | O(n) |
| `lst[i]` 按下标访问 | O(1) |
| `sort()` | O(n log n) |

### 常用方法

| 方法 | 说明 | 注意 |
| --- | --- | --- |
| `append(x)` | 尾部追加单个元素 | 与 `extend` 区分 |
| `extend(iter)` | 追加可迭代对象中的每个元素 | `lst += [1,2]` 等价 |
| `insert(i, x)` | 指定位置插入 | O(n) |
| `remove(x)` | 删除**第一个**匹配的值 | 不存在则 `ValueError` |
| `pop(i=-1)` | 删除并返回该位置元素 | 唯一有返回值的删除方法 |
| `index(x)` | 返回第一个匹配的下标 | 不存在则 `ValueError` |
| `count(x)` | 统计出现次数 | |
| `sort(key=, reverse=)` | **原地**排序，返回 `None` | `sorted()` 才返回新列表 |
| `reverse()` | 原地反转 | `[::-1]` 返回新列表 |

### 切片与切片赋值

切片**不会下标越界**，`lst[2:100]` 只返回到末尾；切片结果永远是**浅拷贝**。切片赋值还能「不等长替换」。

```python
a = [1, 2, 3, 4, 5]
print(a[2:100])        # => [3, 4, 5]   不越界
print(a[:])            # => [1, 2, 3, 4, 5]   浅拷贝惯用写法

a[1:3] = [20, 30, 40] # 切片赋值：区间被替换，左右长度可不同
print(a)              # => [1, 20, 30, 40, 4, 5]
a[::2] = [0, 0, 0]    # 步长切片赋值，左右数量必须一致
print(a)              # => [0, 20, 0, 40, 0, 5]
```

### 排序：sort() 与 sorted()

```python
a = [3, 1, 2]
b = sorted(a)         # 返回新列表，a 不变
a.sort()              # 原地修改，返回 None
print(a, b)           # => [1, 2, 3] [1, 2, 3]

words = ['banana', 'apple', 'cherry']
words.sort(key=len)   # 按长度排（自定义比较用 key）
print(words)          # => ['apple', 'banana', 'cherry']
```

### 列表推导式（含筛选与多层）

```python
[x * 2 for x in range(5)]                  # [0, 2, 4, 6, 8]
[x for x in range(10) if x % 2 == 0]       # 带筛选 [0,2,4,6,8]
[x if x > 5 else -x for x in range(10)]    # 带三元表达式
matrix = [[1, 2], [3, 4]]
[y for row in matrix for y in row]         # 嵌套（先写外层循环）[1,2,3,4]
```

### 嵌套列表的坑

```python
bad = [[0] * 3] * 3      # 三行指向「同一个」内层列表
bad[0][0] = 1
print(bad)               # => [[1, 0, 0], [1, 0, 0], [1, 0, 0]]

good = [[0] * 3 for _ in range(3)]   # 每行都是独立的新列表
good[0][0] = 1
print(good)              # => [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
```

---

## 三、tuple：不可变的序列

```python
t = (1, 2, 3)
single = (1,)      # 单元素必须带逗号，否则 (1) 就是 int 1
a, b = 1, 2        # 元组拆包
a, *rest = [1, 2, 3]   # 星号解包：rest == [2, 3]
```

> **tuple 不可变指的是「元素引用不可变」**：`t = ([1,2], 3)` 里的列表依然可以改。

`namedtuple` 让元组字段有名字，可读性更好；tuple 因不可变而**可哈希**，能作 `dict` 的 key：

```python
from collections import namedtuple
Point = namedtuple('Point', ['x', 'y'])
p = Point(1, 2)
print(p.x, p[0])       # 都可用 => 1 1

d = {(1, 2): 'origin'} # tuple 作 key 没问题
# t = (1, 2, [3])      # TypeError: 含可变元素的 tuple 不可哈希
```

---

## 四、dict：哈希表

CPython 3.7+ 的 dict 由**索引表 + 紧凑的 entries 数组**组成，因此**保证插入顺序**。冲突用开放寻址解决，负载因子超过 2/3 时扩容。

| 方法 | 说明 |
| --- | --- |
| `d[k]` | 取值，key 不存在抛 `KeyError` |
| `d.get(k, default)` | 安全取值，不存在返回 `default` |
| `d.setdefault(k, v)` | 不存在则写入并返回 `v` |
| `d.update(other)` | 批量合并，同 key 覆盖 |
| `d.pop(k, default)` | 删除并返回值 |
| `d.items() / keys() / values()` | 视图对象，随 dict 变化而变化 |
| `d | e` | Python 3.9+ 合并字典（返回新字典） |

按值取键的经典写法：

```python
max(d, key=d.get)                          # 值最大的 key
{v: k for k, v in d.items()}               # 反转字典（值需唯一）
```

### get / setdefault / defaultdict

```python
d = {'a': 1}
print(d.get('b', 0))        # => 0  不存在返回默认值，不写入
d.setdefault('b', []).append(2)   # 不存在则写入并返回该值
print(d)                     # => {'a': 1, 'b': [2]}

from collections import defaultdict
dd = defaultdict(int)        # 缺失 key 自动给 0
dd['count'] += 1
print(dd['count'])           # => 1
```

### 字典推导式与 OrderedDict

```python
{x: x ** 2 for x in range(5)}    # {0:0, 1:1, 2:4, 3:9, 4:16}

from collections import OrderedDict
od = OrderedDict()
od['b'] = 2; od['a'] = 1
od.move_to_end('b')              # 把 b 移到末尾
print(list(od.keys()))           # => ['a', 'b']
```

---

## 五、set：去重与集合运算

```python
a = {1, 2, 3}
b = {3, 4, 5}

a | b      # 并集 {1,2,3,4,5}
a & b      # 交集 {3}
a - b      # 差集 {1,2}
a ^ b      # 对称差（只在一个集合中出现的）
a < b      # 真子集判断
```

`add` 加元素；`remove` 不存在会报错，`discard` 不会。`frozenset` 是不可变集合，可作 `dict` 的 key 或 `set` 的元素。

```python
s = {1, 2, 3}
s.discard(9)            # 不存在也不报错
fs = frozenset([1, 2, 3])   # 不可变集合
d = {fs: 'ok'}          # 可作 key
print({x for x in 'hello'})  # 集合推导式 => {'h','e','l','o'}
```

---

## 六、推导式

```python
[x * 2 for x in range(5)]                    # 列表
{x: x ** 2 for x in range(5)}                # 字典
{x for x in 'hello'}                          # 集合
(x * 2 for x in range(5))                     # 生成器（惰性，不占内存）

[x for x in range(10) if x % 2 == 0]         # 带筛选
[x if x > 5 else -x for x in range(10)]      # 带三元表达式
[y for row in matrix for y in row]           # 嵌套（先写外层循环）
```

> 数据量大的时候用**生成器表达式**，配合 `sum()` / `join()` 可以完全不构造中间列表。

---

## 七、深浅拷贝

```python
import copy
a = [[1, 2], [3, 4]]

b = a              # 只是别名，同一个对象
c = a[:]           # 浅拷贝：外层是新 list，内层还是同一批
d = copy.copy(a)   # 浅拷贝，等价于 a[:]
e = copy.deepcopy(a)   # 深拷贝：完全独立

a[0].append(9)
print(c[0])   # [1, 2, 9]  ← 浅拷贝被影响了
print(e[0])   # [1, 2]     ← 深拷贝不受影响
```

判据：**嵌套结构里改内层，另一个跟着变 → 浅拷贝**。

### 可变默认参数陷阱

```python
def f(x, lst=[]):
    lst.append(x)
    return lst

f(1)          # => [1]
f(2)          # => [1, 2]   ⚠ 上一次调用的结果被保留了！

# 正确写法：用 None 占位，函数体内再初始化
def g(x, lst=None):
    if lst is None:
        lst = []
    lst.append(x)
    return lst
```

---

## 八、高频面试题

**Q1：list 和 tuple 的区别？**

list 可变、tuple 不可变；tuple 因不可变而**可哈希**，能作 dict 的 key；tuple 存储更紧凑、创建更快；语义上 tuple 表示"结构"（如坐标），list 表示"同质的序列"。

**Q2：dict 的 key 有什么要求？为什么 list 不行？**

key 必须**可哈希**。list 是可变对象，没有实现 `__hash__`（返回 `None`），一旦改变内容哈希值就会变，会破坏哈希表。可用 tuple、str、int、frozenset。

**Q3：dict 是有序的吗？**

Python 3.7 起**保证插入顺序**（3.6 是 CPython 的实现细节）。底层用"稀疏索引表 + 紧凑 entries 数组"，既省内存又保序。

**Q4：如何给列表去重并保持原有顺序？**

```python
list(dict.fromkeys(lst))        # 最简洁，O(n)
# 或
seen = set(); [x for x in lst if not (x in seen or seen.add(x))]
```

**Q5：循环中删除列表元素为什么会漏掉？**

删除后后面的元素会左移，但索引仍在递增，导致跳过元素。解决：**倒序遍历**、**遍历副本** `for x in lst[:]`、或直接用**列表推导式**重建。

**Q6：`append` 和 `extend` 的区别？**

```python
a = [1]; a.append([2, 3])   # [1, [2, 3]]  整体作为一个元素
a = [1]; a.extend([2, 3])   # [1, 2, 3]    逐个元素追加
```

**Q7：`sort()` 和 `sorted()` 的区别？**

`sort()` 是 list 的方法，**原地修改，返回 `None`**；`sorted()` 是内置函数，**返回新列表**，可用于任何可迭代对象。两者都支持 `key` 和 `reverse`。

**Q8：`[[0] * 3] * 3` 创建二维列表有什么问题？**

三行指向**同一个**内层列表，改一个全变。正确写法：`[[0] * 3 for _ in range(3)]`。

**Q9：如何找出列表中出现次数最多的元素？**

```python
from collections import Counter
Counter(lst).most_common(1)      # [('a', 3)]
```

**Q10：dict 的 `get` 和 `[]` 取值有何不同？**

`[]` 在 key 不存在时抛 `KeyError`，`get` 返回 `None` 或指定的默认值。需要"不存在时初始化"的场景用 `setdefault` 或 `collections.defaultdict`。

**Q11：`set` 和 `dict` 为什么查找这么快？**

底层都是哈希表，平均 O(1)；代价是占内存更多、set 无序（3.7+ dict 保序）。

**Q12：浅拷贝和深拷贝的区别？什么时候必须用深拷贝？**

浅拷贝只复制最外层，内层元素共享；深拷贝递归复制全部层级。只要容器里**嵌套了可变对象**且需要独立修改，就必须用 `copy.deepcopy`。

**Q13：`*args` 接收的是 tuple，`**kwargs` 接收的是 dict——它们能用在其他数据结构里吗？**

可以：`[*lst]` 解包成列表，`{**d1, **d2}` 合并字典，`{*s}` 把集合转成元素在字典里当 key。

---

## 九、易错点

1. **别用可变对象做默认参数**：`def f(x, lst=[])` 的 `lst` 在函数定义时创建一次，多次调用会累积
2. **`sort()` 返回 `None`**：`b = a.sort()` 会得到 `None`，要新列表请用 `sorted(a)`
3. **遍历时不要修改容器大小**：删除/新增都会导致行为异常，先拷贝或推导式
4. **set 无序**：不要用索引访问，也不要依赖遍历顺序（相同内容的 set，打印顺序由哈希决定）
5. **`in` 对 list 是 O(n)**：频繁查找应换成 set 或 dict，直接降到 O(1)
6. **浅拷贝的陷阱**：嵌套结构要用 `deepcopy`；一维结构用 `[:]` 就够了
7. **单元素 tuple 漏写逗号**：`(1)` 是 int，`(1,)` 才是 tuple
8. **浮点比较别用 `==`**：`0.1 + 0.2 == 0.3` 为 False，用 `math.isclose` 或 `Decimal`
