---
title: Python 基础笔记 · 第 1 章：语法基础
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 语法基础, 变量, 运算符]
summary: 学完 Python 基础后的第一份整理：动态类型与内存管理、变量即引用、运算符全家福与优先级、is 与 == 的区别、小整数池与字符串驻留、缩进即语法、if/while/for 流程控制与 break/continue/循环 else、源码编码声明，以及 20 道高频面试题。
---

## 一、必须记住的知识点

### 1. Python 是动态的、强类型的语言

- **动态类型**：变量不需要声明类型，类型信息在运行时绑定在「值」上，而不是变量上
- **强类型**：不同类型之间不会隐式转换，`1 + 'a'` 直接报错，而不是给你拼成 `'1a'`

```python
x = 10        # x 只是个名字，指向 int 对象 10
x = 'hello'   # 重新指向 str 对象，完全合法
print(1 + 'a')  # TypeError: unsupported operand type(s)
```

> 记忆口诀：**变量是标签，不是盒子**。赋值就是把标签贴到对象上。

### 2. 标识符与命名规范

- 由字母、数字、下划线组成，不能以数字开头，区分大小写
- 查看所有关键字：`import keyword; print(keyword.kwlist)`
- 命名约定：
  - 普通变量/函数：`snake_case`
  - 常量：`MAX_SIZE`（全大写，约定而非强制）
  - 类：`PascalCase`
  - 内部使用：`_name`（约定私有）、`__name`（触发名称改写 name mangling）

### 3. 变量：名字到对象的引用（一切皆对象）

Python 中「一切皆对象」，变量本身只是**绑定到对象的一个名字（引用）**，名字与对象之间是多对一的关系。理解这一点是看懂后续所有现象（可变/不可变、拷贝、参数传递）的钥匙。

```python
a = [1, 2, 3]   # 创建 list 对象，把名字 a 贴上去
b = a           # b 也贴到「同一个」list 对象上（引用共享，不是拷贝）
b.append(4)
print(a)        # => [1, 2, 3, 4]   a 和 b 看到的是同一个对象

# 文字示意：
#   a ─┐
#      ├─► [1, 2, 3, 4]   (内存里只有一个 list)
#   b ─┘
```

「`a = b`」的含义不是「把 b 的值复制给 a」，而是「让 a 也指向 b 当前指向的那个对象」。只有当对象**可变**且被原地修改时，多个名字才会互相影响；如果对名字重新赋值（`a = [...]`），只是把标签撕下贴到别处，不影响原对象和其他名字。

### 4. 注释与文档字符串

- 单行注释用 `#`，`#` 之后到行尾都被忽略
- 多行注释通常用多个 `#`，或用一个未被赋值的字符串字面量
- **文档字符串（docstring）**：模块、类、函数的第一个语句如果是一个字符串字面量，它就成了该对象的 `__doc__`，可用 `help()` 查看

```python
# 这是单行注释

"""
这是一段多行字符串，
常被临时当作多行注释使用，
但注意不要放在会执行的位置。
"""

def add(a, b):
    """返回 a 与 b 的和（这是 docstring）。"""
    return a + b

print(add.__doc__)   # => 返回 a 与 b 的和（这是 docstring）。
```

> 约定：对外公开的函数/类都写 docstring，用三引号，首行一句话概述，空一行后写详细说明。

### 5. 缩进即语法、语句与表达式、行连接

- **缩进是语法的一部分**，不是风格。统一用 4 个空格，**禁止空格与 Tab 混用**，否则 `IndentationError`。
- **语句（statement）**：会做某件事，如 `x = 1`、`if`、`for`、`def`，没有值。
- **表达式（expression）**：会求出一个值，如 `1 + 2`、`len(s)`、`x if c else y`。
- 一行写不下时，可用 `\` 显式续行，或在括号 `()` `[]` `{}` 内**隐式续行**（推荐）。

```python
# 显式续行
total = 1 + 2 + 3 + \
        4 + 5

# 隐式续行（括号内无需 \）
total = (1 + 2 + 3 +
         4 + 5)

if (x > 0 and
        y < 10):     # 条件括号内换行，清晰且合法
    print(x)
```

### 6. 基本字面量类型

字面量（literal）是写进代码里的「常量值」，对应几种内置不可变类型：

| 字面量 | 类型 | 示例 |
| --- | --- | --- |
| 整数 | `int` | `10`、`0b1010`、`0o17`、`0xFF` |
| 浮点 | `float` | `3.14`、`1e-3` |
| 复数 | `complex` | `1 + 2j` |
| 布尔 | `bool` | `True`、`False` |
| 空 | `NoneType` | `None` |

```python
print(type(10))     # => <class 'int'>
print(type(3.14))   # => <class 'float'>
print(type(1 + 2j)) # => <class 'complex'>
print(type(None))   # => <class 'NoneType'>
print(None is None) # => True  （None 是单例）
```

> `None` 表示「没有值 / 缺失」，是唯一的 `NoneType` 实例，判断时永远用 `is None`。

### 7. 运算符全家福（含优先级表）

| 类别 | 运算符 | 说明 |
| --- | --- | --- |
| 算术 | `+ - * / // % **` | `/` 真除法；`//` 向下取整；`**` 幂 |
| 比较 | `== != > < >= <=` | 可链式：`1 < x < 10` |
| 赋值 | `= += -= *= /= //= %= **= :=` | `:=` 海象运算符 |
| 逻辑 | `and` `or` `not` | 短路求值，返回操作数本身 |
| 位运算 | `& \| ^ ~ << >>` | 按位操作 |
| 成员 | `in` `not in` | 是否包含 |
| 身份 | `is` `is not` | 是否同一对象（`id` 相同） |

**优先级（从低到高）：** `or` < `and` < `not` < 比较 < 位运算(`| ^ &` << `>>`) < 算术( `+ -` < `* / // %` ) < 一元(`- ~`) < `**`。

```python
# / 永远返回 float；// 向下取整（注意是「向下」不是「向零」）
print(7 / 2)     # => 3.5
print(7 // 2)    # => 3
print(-7 // 2)   # => -4

# % 结果符号跟除数
print(-7 % 3)    # => 2

# ** 右结合
print(2 ** 3 ** 2)  # => 512

# 海象运算符 :=  —— 在表达式里顺便赋值
data = [1, 2, 3, 4, 5]
if (n := len(data)) > 3:
    print(n)    # => 5

# 逻辑短路：返回的是操作数本身，不是布尔值
print(0 or 'abc')   # => abc   （or 返回第一个为真的值）
print('' and 'abc') # => ''    （and 返回第一个为假的值）
```

```python
# 位运算（按补码运算，~x 等价于 -(x+1)）
print(5 & 3)    # => 1   0101 & 0011 = 0001
print(5 | 3)    # => 7   0101 | 0011 = 0111
print(5 ^ 3)    # => 6   0101 ^ 0011 = 0110
print(5 << 1)   # => 10  左移一位 = 乘 2
print(~5)       # => -6
```

### 8. 输入 input() 与输出 print()

- `input(prompt)` **永远返回字符串**，需要数字要自己转型。
- `print(*objects, sep=' ', end='\n', file=sys.stdout)`：`sep` 控制分隔符，`end` 控制结尾（默认换行），`file` 可重定向到文件。

```python
# input 永远返回 str
age = input('age: ')   # 用户输入 18
print(type(age))        # => <class 'str'>
age = int(age)          # 需要手动转换

# print 的 sep / end
print(1, 2, 3, sep='-')   # => 1-2-3
print('a', end=' ')        # 不换行
print('b')                 # => a b
```

### 9. 小整数池与字符串驻留（intern）机制

CPython 为性能会**缓存/复用**部分对象：

- **小整数池**：`-5` 到 `256` 之间的整数全局唯一，任何地方用到都指向同一个对象。
- **字符串驻留（intern）**：仅含字母、数字、下划线的字符串字面量会被自动 intern（复用同一份）；编译期的常量也会因「常量折叠」被合并。

```python
a = 256; b = 256
print(a is b)   # => True   （小整数池命中）

a = 257; b = 257
print(a is b)   # => 通常 False（不同对象）；但若写在同一个 .py 文件里，
                #    解释器可能把 257 当常量折叠成同一个对象 → True
                #    不要依赖这种细节，比较值请用 ==

s1 = 'hello_world'
s2 = 'hello_world'
print(s1 is s2) # => True   （符合驻留规则，被复用）

s3 = 'hello world!'   # 含空格，通常不被 intern
s4 = 'hello world!'
print(s3 is s4)       # => 通常 False
```

### 10. is 与 == 的本质区别

- `==` 比较**值**是否相等，调用对象的 `__eq__` 方法。
- `is` 比较**是否是同一个对象**（比较 `id()`，即内存身份）。
- 判断 `None` / `True` / `False` 等单例，用 `is`；比较值用 `==`。

```python
a = [1, 2]; b = [1, 2]
print(a == b)   # => True   值相等
print(a is b)   # => False  不是同一个对象
print(id(a) == id(b))  # => False

print(None is None)    # => True
```

### 11. 可变类型与不可变类型初识（为 ch02 铺垫）

- **不可变（immutable）**：`int`、`float`、`str`、`bool`、`tuple`、`frozenset`、`bytes`。创建后内容不能改，`x += 1` 实际是「生成新对象，再把名字贴上去」。
- **可变（mutable）**：`list`、`dict`、`set`、`bytearray`。可以原地修改，且多个名字共享时互相可见。

```python
# 不可变：a += 1 其实是 a = a + 1，a 指向了新对象
a = 1
print(id(a))
a += 1
print(id(a))   # 地址变了 → 新对象

# 可变：原地修改，地址不变
lst = [1, 2]
print(id(lst))
lst.append(3)
print(id(lst)) # 地址不变 → 同一个对象被改
```

### 12. 内存管理：引用计数为主，垃圾回收为辅

- **引用计数**：每个对象记录被引用次数，归零立即回收。
- **循环引用**靠**标记—清除**解决。
- **分代回收**：对象存活越久，被扫描频率越低（三代）。

```python
import sys
a = [1, 2, 3]
print(sys.getrefcount(a))  # 比实际多 1，因为传参本身也产生一次引用
```

### 13. __name__ == '__main__' 的意义

每个 `.py` 文件都有一个内置变量 `__name__`：被直接运行时它是 `'__main__'`；被 `import` 导入时它是**模块名**。用它包住「只在直接运行时才执行」的代码，可以让模块既能当脚本跑，又能被安全导入复用。

```python
# my_module.py
def add(a, b):
    return a + b

if __name__ == '__main__':
    # 只有直接运行 python my_module.py 时才执行
    print(add(1, 2))

# 其他文件 import my_module 时，上面的 print 不会被执行
```

### 14. 流程控制：if / while / for

**（1）条件分支**

```python
score = 85
if score >= 90:
    level = 'A'
elif score >= 80:
    level = 'B'
else:
    level = 'C'
```

**三元表达式**（只有「二选一」时用，写复杂了反而难读）：

```python
level = '及格' if score >= 60 else '不及格'
```

**（2）while 循环**

```python
i = 0
while i < 3:
    print(i)
    i += 1
```

**（3）for 循环**：本质是「遍历可迭代对象」，不是 C 风格的计数循环。

```python
for ch in 'abc':        # 遍历字符串
    print(ch)

for i in range(3):      # range 生成惰性序列 0,1,2（左闭右开）
    print(i)

for idx, val in enumerate(['a', 'b']):   # 同时拿下标和值
    print(idx, val)
```

> `range(start, stop, step)` **左闭右开**，`range(1, 10, 2)` 得到 1,3,5,7,9；`stop` 取不到，这是最常见的差一错误来源。

**（4）break / continue / else**

- `break`：立即跳出**当前这一层**循环；
- `continue`：跳过本次剩余语句，直接进入下一次迭代；
- 循环的 **`else` 子句**：只有在循环**正常结束**（未被 `break` 打断）时才执行。

```python
for n in range(2, 10):
    for x in range(2, n):
        if n % x == 0:
            break          # 找到因子，不是质数
    else:
        print(n, '是质数')  # 内层没有被 break，才执行
```

> 循环 `else` 极易被误读成「否则」——它不是 `if-else` 的 else，而是「循环没被打断」的奖励分支。觉得绕就用一个标志变量替代，可读性更好。

**（5）不要在遍历时增删元素**

```python
nums = [1, 2, 3, 4]
for n in nums:
    if n % 2 == 0:
        nums.remove(n)     # 危险：边遍历边改，元素会被跳过
# 正确做法：遍历副本 / 用推导式生成新列表
nums = [n for n in nums if n % 2 != 0]
```

### 15. 源码编码与编码声明

- Python 3 **默认源码就是 UTF-8**，可以直接写中文，不需要声明；
- Python 2 默认 ASCII，源码含中文必须声明编码（老项目里会见到）：

```python
# -*- coding: utf-8 -*-
```

- 常见编码：`ASCII`（单字节，只覆盖英文）、`GBK`（中文双字节）、`UTF-8`（变长，一个汉字 3 字节，国际化首选）；
- 源码文件、读写文件、网络传输三者的编码要**保持一致**，否则就是乱码的根源。

```python
s = '中文'
raw = s.encode('utf-8')     # str -> bytes
back = raw.decode('utf-8')  # bytes -> str
print(len(s), len(raw))     # 2 6（UTF-8 下汉字占 3 字节）
```

> 更深入的 `encode/decode`、`errors` 容错策略、`bytes` 与 `str` 的边界，见第 4 章字符串。

---

## 二、常用内置函数速查

| 函数 | 作用 | 示例 |
| --- | --- | --- |
| `type(x)` | 查看类型 | `type(3.0)` → `float` |
| `isinstance(x, T)` | 类型判断（含继承） | `isinstance(True, int)` → `True` |
| `id(x)` | 对象内存地址 | 判断是否为同一对象 |
| `dir(x)` | 列出所有属性方法 | `dir(str)` |
| `help(x)` | 查看文档 | `help(str.split)` |
| `abs / round / pow / divmod` | 数学运算 | `divmod(7, 2)` → `(3, 1)` |
| `bin / oct / hex` | 进制转换 | `bin(10)` → `'0b1010'` |
| `ord / chr` | 字符与码点互转 | `ord('A')` → `65` |
| `sum / max / min / sorted` | 聚合 | `sorted(x, key=...)` |
| `any / all` | 逻辑聚合 | 空序列：`any` → `False`，`all` → `True` |
| `enumerate / zip` | 遍历工具 | `zip` 以最短的为准 |
| `range` | 惰性序列 | `range(1, 10, 2)` |
| `len / hash / repr` | 长度 / 哈希 / 官方字符串 | `hash('a')` |
| `eval / exec` | 执行字符串代码 | 谨慎使用，注意安全 |

> `type()` 不做继承判断，`isinstance()` 会。判断类型时**优先用 `isinstance`**。

---

## 三、高频面试题（附答案）

**Q1：`is` 和 `==` 的区别？**

`==` 比较**值**是否相等（调用 `__eq__`），`is` 比较**是否是同一个对象**（比较 `id()`）。判断 `None`、单例对象时用 `is`。

```python
a = [1, 2]; b = [1, 2]
a == b   # True
a is b   # False
```

**Q2：什么是小整数池和字符串驻留？**

CPython 为优化性能，会**缓存**部分对象复用：

- 小整数池：`-5` 到 `256` 之间的整数全局唯一
- 字符串驻留：仅含字母、数字、下划线的字符串会被 intern（编译期常量还会自动合并）

```python
a = 256; b = 256
a is b        # True
a = 257; b = 257
a is b        # False（交互式逐行执行时；写在同一个 .py 文件里可能因常量折叠为 True）
```

> 面试官常追问：为什么 `a=257;b=257` 有时 `is` 为 True？答：同一个代码块的常量会被折叠复用，但这是实现细节，比较值请一律用 `==`。

**Q3：Python 中的可变类型和不可变类型分别有哪些？**

- **不可变**：`int`、`float`、`bool`、`str`、`tuple`、`frozenset`、`bytes`；
- **可变**：`list`、`dict`、`set`、`bytearray`、自定义对象（默认可变）。

区分它们的意义在于：不可变对象**可哈希**（能作 dict 的 key、set 的元素）、可作为默认参数安全共享；可变对象在**函数传参、浅拷贝、默认参数**这三处最容易出意外，因为它们能被原地修改。

**Q4：Python 的垃圾回收机制？**

以**引用计数**为主（实时、无停顿），辅以**标记—清除**处理循环引用，再用**分代回收**降低扫描开销。可用 `gc` 模块手动控制。

**Q5：`and` / `or` 的短路求值是怎么工作的？它们返回什么？**

`and`：从左到右求值，遇到第一个假值就**停下来返回它**；全为真则返回最后一个值。
`or`：遇到第一个真值就停下来返回它；全为假则返回最后一个值。

注意它们返回的是**操作数本身**，不是 `True`/`False`，所以常被用来写默认值：

```python
print(0 and 'x')        # 0
print('a' and 'b')      # b
print('' or 'default')  # default
print(None or 0 or [])  # []

name = user_input or '匿名'   # 常用的兜底写法
```

短路特性还能保证安全：`if lst and lst[0] > 0` 在 `lst` 为空时不会去取下标。

**Q6：`/ ` 和 `//` 的区别？负数取整要注意什么？**

`/` 返回 float；`//` 是**向下取整**（floor），所以 `-7 // 2 == -4` 而不是 `-3`。

**Q7：如何实现两个变量交换？**

```python
a, b = b, a     # 元组打包解包，无需临时变量
```

**Q8：Python 是解释型语言还是编译型语言？**

严格说，Python 是**「先编译成字节码，再由虚拟机解释执行」**：`.py` 源码先被编译成字节码（缓存在 `__pycache__/*.pyc`），然后由 CPython 虚拟机逐条执行字节码。所以它既不是纯粹的编译型（不直接产出机器码），也不是纯粹的解释型（不是逐行解析源码）。

对比：C 直接编译成机器码，启动快、运行快，但跨平台要重新编译；Python 多了一层字节码虚拟机，**跨平台、开发快**，但执行效率低于编译型语言。

**Q9：Python2 与 Python3 的主要区别？**

`print` 变函数；`/` 真除法；默认编码 UTF-8（Python2 是 ASCII）；`range` 返回惰性对象（Python2 的 `xrange`）；`input()` 统一返回字符串。

**Q10：`in` 作用在 dict 上判断的是什么？**

判断的是 **key**，不是 value。判断 value 用 `v in d.values()`。

**Q11：为什么说 Python 中「一切皆对象」？**

因为数字、字符串、函数、类、模块，甚至类型本身，在 Python 里都是**对象**：都有类型（`type(x)`）、都有唯一标识（`id(x)`）、都可以赋值给变量、放进容器、作为参数传递。

```python
print(type(1), type('a'), type(len), type(int))
# <class 'int'> <class 'str'> <class 'built-in_function_or_method'> <class 'type'>

def f(): pass
print(f.__name__)          # 函数有属性
print(isinstance(f, object))   # True
print(isinstance(int, object)) # True  连类型也是对象
```

这一点的直接推论是：**函数是一等公民**（可作参数/返回值，这是装饰器和闭包的前提），且**变量只是贴在对象上的名字**，赋值不复制对象。

**Q12：`input()` 返回什么类型？需要数字怎么办？**

`input()` 永远返回 `str`；需要数字要 `int(input())` / `float(input())` 手动转换，否则 `1 + input()` 会 `TypeError`。

**Q13：`pass` 语句有什么用？**

`pass` 是**空操作语句**，执行它什么都不发生，纯粹为了「语法上需要一条语句」时占位。典型场景：先搭好函数/类的骨架、故意留一个空分支、或捕获异常后什么都不做。

```python
def todo():
    pass          # 占位，避免 IndentationError

try:
    risky()
except Exception:
    pass          # 有意忽略（生产环境应记日志，别静默吞掉）
```

**Q14：`break`、`continue`、`return` 的区别？**

- `break`：终止**当前这一层**循环，跳到循环之后继续执行；
- `continue`：结束本次迭代，进入下一次循环；
- `return`：直接结束**整个函数**并返回，连外层循环也一并退出。

嵌套循环里 `break` 只跳出最内层，需要跳出多层得用标志位、函数 `return` 或异常。

**Q15：循环的 `else` 子句什么时候执行？**

`for...else` / `while...else` 的 `else` 只在循环**正常走完、没有被 `break` 打断**时执行。语义是「没找到 / 没被打断时的分支」，和 `if-else` 的「否则」没有任何关系。

```python
for n in range(2, 10):
    for x in range(2, n):
        if n % x == 0:
            break
    else:
        print(n, '是质数')   # 内层循环没被 break，才执行
```

**Q16：`.py` 和 `.pyc` 有什么区别？`__pycache__` 是什么？**

`.py` 是源码，`.pyc` 是**编译后的字节码**。Python 执行时先把源码编译成字节码，再交给虚拟机执行；为省去重复编译，会把字节码缓存到 `__pycache__/` 目录（文件名形如 `module.cpython-312.pyc`）。`.pyc` 里存的是字节码不是机器码，**跨平台、可反编译**，所以删掉它没影响（下次自动重建），也不能替代源码分发。

**Q17：`range()` 返回列表吗？和 Python 2 的 `range` / `xrange` 有什么区别？**

Python 3 的 `range()` 返回**惰性序列对象**（不是列表），只占用固定内存，支持索引与 `len()`。Python 2 的 `range()` 直接返回列表，`xrange()` 才是惰性版本。所以 Python 3 里 `range(10**9)` 也不会爆内存，需要列表时才 `list(range(...))`。

**Q18：遍历列表时修改列表会发生什么？怎么正确处理？**

会**漏掉元素**：`for` 依赖内部索引递增，删除元素后后面的元素前移，导致下一个元素被跳过。正确做法是**遍历副本**或直接生成新列表：

```python
nums = [1, 2, 3, 4]
for n in nums[:]:              # 遍历副本
    if n % 2 == 0:
        nums.remove(n)

nums = [n for n in nums if n % 2 != 0]   # 更推荐：推导式造新列表
```

**Q19：`assert` 和普通条件判断有什么区别？什么时候不该用 `assert`？**

`assert` 是**调试断言**，条件为假时抛 `AssertionError`；且**在 `-O` 优化模式下会被整体移除**。因此它只适合「绝不可能发生」的内部自检。**不要用 assert 做参数校验或业务校验**（线上可能被优化掉而不生效），这类校验应写显式 `if ...: raise ValueError(...)`。

**Q20：为什么 Python 用缩进表示代码块？混用 Tab 和空格会怎样？**

Python 用**缩进**划分代码块，强制统一风格、省掉花括号。缩进相同的行属于同一块，块结束靠「缩进变浅」体现。Tab 与空格混用时，虽然 Python 3 会报 `TabError`（不一致的缩进方式），但不同编辑器把 Tab 显示成不同宽度，极易造成「看着对齐、实际不对齐」的隐患，**统一用 4 个空格**是 PEP 8 的要求。

---

## 四、易错点

1. **浮点精度**：`0.1 + 0.2 == 0.3` 是 `False`。需要精确计算用 `decimal.Decimal`，比较用 `math.isclose()`
2. **`is` 比较字面量**：永远用 `==` 比较值，`is` 只用于 `None` / `True` / `False`
3. **链式赋值**：`a = b = []` 之后 `a` 和 `b` 指向**同一个**列表
4. **`+=` 的陷阱**：对不可变类型 `a += b` 等价于 `a = a + b`（新对象）；对 list 则是原地修改（同一对象）
5. **`round()` 是银行家舍入**：`round(2.5) == 2`，`round(3.5) == 4`（向偶数靠拢）
6. **默认参数不要用可变对象**：`def f(x, lst=[])` 会累积历史调用的结果，应写 `lst=None`
7. **Tab 与空格混用**：会 `IndentationError`，统一 4 空格
8. **`input()` 当数字用**：记得转型，否则类型是 `str`
9. **`range` 左闭右开**：`range(1, 5)` 是 1~4，不含 5，差一错误的高发区
10. **误读循环 `else`**：它不是「否则」，而是「循环未被 `break` 打断时才执行」
11. **`break` 只跳出一层**：嵌套循环要跳出多层得用标志位或函数 `return`
12. **边遍历边删元素**：会漏掉元素，应遍历副本或改用推导式
13. **用 `assert` 做参数校验**：`-O` 模式下 assert 会被移除，业务校验必须显式 `raise`
14. **循环变量会泄漏**：`for` 结束后循环变量仍留在作用域里（函数内同理），别指望它被自动清理
