---
title: Python 基础笔记 · 第 4 章：字符串
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 字符串, 编码, f-string]
summary: 字符串的不可变性、几十个常用方法速查、三种格式化方式对比、join 与 + 的性能差异，以及 encode/decode 乱码的成因与排查。
---

## 一、核心特性：不可变

字符串是**不可变序列**——任何"修改"操作都会返回一个新字符串，原串不变。

```python
s = 'hello'
s[0] = 'H'        # TypeError: 'str' object does not support item assignment
s = 'H' + s[1:]   # 正确：构造新字符串
list(s)           # 需要频繁改动时先转 list，改完再 ''.join()
```

**好处**：可哈希（能作 dict 的 key）、线程安全、支持字符串驻留（intern）优化。

> 唯一的例外性优化：CPython 对 `s = s + 'a'` 这种**只有一个引用**的场景会尝试原地扩容，但**不能依赖**，循环拼接一定要用 `join`。

### 不可变到底意味着什么

"不可变"约束的是**对象**，不是**变量**。变量可以随时改指向，对象本身的内存内容永不改动。用 `id()` 可以看得很清楚：

```python
s = 'hello'
print(id(s))            # => 例如 2158374096176

s = s.upper()           # upper 返回的是全新对象
print(s, id(s))         # => HELLO 2158374098032   id 变了

t = 'hello'
t.upper()               # 返回值没接住，等于白算一遍
print(t)                # => hello   原串纹丝不动
```

所以一条铁律：**所有字符串方法都要接收返回值**。`s.strip()`、`s.replace()` 单独写一行是完全无效的代码。

需要"逐字符改动"时，正确姿势是转成可变容器（`list`）改完再合并：

```python
s = 'hello world'
chars = list(s)              # => ['h','e','l','l','o',' ','w',...]
for i, c in enumerate(chars):
    if c in 'aeiou':
        chars[i] = c.upper()
s2 = ''.join(chars)
print(s2)                    # => hEllO wOrld
```

### 不可变带来的三个工程收益

1. **可哈希**：内容确定则 `hash()` 恒定，因此能当 `dict` 的键、放进 `set`。
2. **共享安全**：多个变量、多个线程指向同一字符串，谁都改不了它，无需加锁。
3. **可缓存/驻留**：解释器能放心地复用相同内容的对象（见后文 intern）。

```python
d = {'name': '小明'}          # str 可作 key，因为可哈希
print(hash('abc') == hash('abc'))   # => True

# 对比：list 可变 → 不可哈希
# {['a']: 1}                  # TypeError: unhashable type: 'list'
```

### 创建与字面量

```python
a = 'single'
b = "double"                  # 单双引号完全等价，含撇号时交替使用更省心
c = "It's fine"               # 不用转义
d = 'He said "hi"'

e = 'py' 'thon'               # 相邻字面量自动拼接 => 'python'
f = ('很长的一句话，'
     '可以用括号分成多行书写')   # 编译期拼接，无运行时开销

g = str(123)                  # 其他类型转字符串 => '123'
h = 'ab' * 3                  # 重复 => 'ababab'
print(e, g, h)                # => python 123 ababab
```

> 注意 `'py' 'thon'` 的自动拼接只对**字面量**生效，变量之间必须写 `+` 或用 `join`。写列表时漏了逗号会静默拼接，是个隐蔽 bug：`['a' 'b', 'c']` 得到 `['ab', 'c']`。

### 转义字符

| 转义 | 含义 |
| --- | --- |
| `\n` | 换行 |
| `\r` | 回车（Windows 换行是 `\r\n`） |
| `\t` | 制表符 |
| `\\` | 一个反斜杠 |
| `\'` / `\"` | 引号 |
| `\0` | 空字符 |
| `\uXXXX` | 4 位十六进制 Unicode 码点 |
| `\xXX` | 2 位十六进制字符 |

```python
print('a\tb\nc')              # => a	b 换行 c
print('C:\\Users\\new')       # => C:\Users\new
print('\u4e2d\u6587')         # => 中文
print(len('\\'))              # => 1   源码写两个字符，实际只有一个
```

### 原始字符串与转义

```python
r'C:\new\test'    # r 前缀：反斜杠不转义，写正则和 Windows 路径时必用
'''多行
字符串'''          # 保留换行，也常当临时注释用
```

原始字符串的本质：**关闭反斜杠的转义解释**，`\n` 就是"反斜杠 + n"两个字符。

```python
p1 = 'C:\new\table'           # \n \t 被转义了，路径已损坏
p2 = r'C:\new\table'
print(len(p1), len(p2))       # => 12 14
print(p2)                     # => C:\new\table

import re
re.findall(r'\d+', 'a12b3')   # => ['12', '3']   正则一律用 r''
```

> `r''` 有一个限制：**不能以奇数个反斜杠结尾**，`r'C:\'` 是语法错误。真要以反斜杠结尾就写 `'C:\\'` 或 `r'C:' + '\\'`。

### 三引号与多行文本

```python
tpl = """第一行
第二行
    缩进保留"""

doc = '''\
去掉行首换行的写法'''        # 行尾 \ 表示续行

def f():
    """函数的文档字符串，用 f.__doc__ 读取。"""
    return 1

print(f.__doc__)              # => 函数的文档字符串，用 f.__doc__ 读取。
```

### 索引、切片与遍历

字符串是序列，索引/切片/`len`/`in`/迭代全部可用。切片语法 `s[start:stop:step]`，**左闭右开**，越界不报错。

```python
s = 'abcdefg'
print(s[0], s[-1])            # => a g
print(s[1:4])                 # => bcd
print(s[:3], s[3:])           # => abc defg
print(s[::2])                 # => aceg   隔一个取
print(s[::-1])                # => gfedcba   反转
print(s[10:20])               # =>          越界切片返回空串，不报错
print(len(s), 'cd' in s)      # => 7 True

for i, ch in enumerate(s[:3]):
    print(i, ch)              # => 0 a / 1 b / 2 c
```

> Python 3 中遍历字符串得到的是**长度为 1 的字符串**（没有独立的 char 类型）；而遍历 `bytes` 得到的是 `int`，这点常在处理二进制时踩坑。

---

## 二、常用方法速查

### 查找与判断

| 方法 | 说明 | 找不到时 |
| --- | --- | --- |
| `find(sub)` / `rfind` | 返回下标 | `-1` |
| `index(sub)` / `rindex` | 返回下标 | 抛 `ValueError` |
| `count(sub)` | 出现次数 | `0` |
| `startswith(x)` / `endswith(x)` | 前后缀判断（可传元组） | `False` |
| `in` 运算符 | 子串判断 | `False` |

四个查找方法的差别只有两点：**从哪头找**、**找不到怎么办**。

```python
s = 'abcabc'
print(s.find('b'))            # => 1    从左找
print(s.rfind('b'))           # => 4    从右找
print(s.find('z'))            # => -1   安全，返回 -1
print(s.count('bc'))          # => 2
print(s.find('b', 2))         # => 4    可指定起始位置 find(sub, start, end)

try:
    s.index('z')
except ValueError as e:
    print('index 会抛异常:', e)   # => index 会抛异常: substring not found
```

选择原则：只关心"有没有"用 `in`（最快最清晰）；要位置且允许缺失用 `find`；缺失属于逻辑错误就用 `index` 让它炸出来。

```python
name = 'report_2026.tar.gz'
print(name.startswith(('report', 'log')))   # => True   可传元组一次判断多个
print(name.endswith('.gz'))                 # => True
```

### 修改与切分

| 方法 | 说明 |
| --- | --- |
| `replace(old, new, n)` | 替换，最多 n 次 |
| `split(sep)` | 按分隔符切分成列表 |
| `rsplit(sep, n)` | 从右侧切分 |
| `splitlines()` | 按行切分（识别 `\n` `\r\n`） |
| `partition(sep)` | 切成 `(前, 分隔符, 后)` 三元组 |
| `rpartition(sep)` | 同上，从右侧找分隔符 |
| `join(iterable)` | **用当前字符串连接**可迭代对象 |
| `strip(chars)` / `lstrip` / `rstrip` | 去掉**两端**指定字符（默认空白） |
| `removeprefix` / `removesuffix` | 去掉前缀/后缀（3.9+，比切片安全） |
| `upper/lower/title/capitalize/swapcase/casefold` | 大小写转换 |
| `center(w)` / `ljust` / `rjust` / `zfill(w)` | 对齐与补零 |
| `expandtabs(n)` | 把 `\t` 展开成空格 |
| `maketrans` + `translate` | 批量字符映射 |
| `encode(enc)` | 编成 `bytes` |

### 判断类（全部返回 bool）

`isdigit` `isdecimal` `isnumeric` `isalpha` `isalnum` `isspace` `isupper` `islower` `istitle` `isidentifier` `isprintable`

三个"数字判断"的区别：

| 方法 | `'123'` | `'²'` | `'½'` | `'一'` | 说明 |
| --- | --- | --- | --- | --- | --- |
| `isdecimal()` | 是 | 否 | 否 | 否 | 最严格，纯 0-9 |
| `isdigit()` | 是 | 是 | 否 | 否 | 含上标等数字字符 |
| `isnumeric()` | 是 | 是 | 是 | 是 | 最宽松，含汉字数字 |

```python
print('123'.isdecimal(), '²'.isdecimal(), '一'.isnumeric())   # => True False True
print('-5'.isdigit())        # => False   负号、小数点都不算数字！
print('abc1'.isalnum(), '中文'.isalpha())                      # => True True
print('  \t\n'.isspace())    # => True
print(''.isdigit())          # => False   空串一律 False，省一次判空
```

> 校验"用户输入是不是整数"最稳的是 `try: int(s)`，`isdigit()` 处理不了负号和 `'１２３'` 这类全角字符（全角其实会返回 True，反而更危险）。

### 大小写与 casefold

```python
s = 'hello World'
print(s.upper(), s.lower())         # => HELLO WORLD hello world
print(s.title())                    # => Hello World   每个单词首字母大写
print(s.capitalize())               # => Hello world   仅首字符大写，其余转小写
print(s.swapcase())                 # => HELLO wORLD

# casefold 比 lower 更激进，用于跨语言"无大小写比较"
print('Straße'.lower())             # => straße
print('Straße'.casefold())          # => strasse
print('Straße'.casefold() == 'STRASSE'.casefold())   # => True
```

结论：**面向用户展示用 `title`/`capitalize`，做相等比较用 `casefold`**（纯 ASCII 场景 `lower` 也够）。

### 对齐与填充

```python
print('abc'.center(11, '*'))    # => ****abc****
print('abc'.ljust(6, '.') + '|')# => abc...|
print('abc'.rjust(6) + '|')     # =>    abc|
print('7'.zfill(3))             # => 007
print('-7'.zfill(4))            # => -007   zfill 会把符号留在最前面

for name, n in [('CPU', 93), ('内存', 7)]:
    print(f'{name:<6}{n:>4}%')  # 实际项目里更常用 f-string 对齐
```

### 去除：strip 家族

```python
print('  hi  '.strip() + '|')       # => hi|
print('  hi  '.lstrip() + '|')      # => hi  |
print('xxhixx'.strip('x'))          # => hi
print('mississippi'.strip('mip'))   # => ss    按字符集合去，不是按子串！
print('abcabc'.strip('abc'))        # => (空串)

# 想去前缀请用 3.9+ 的 removeprefix
print('test_a.py'.removeprefix('test_'))    # => a.py
print('a.py'.removeprefix('test_'))         # => a.py   不匹配时原样返回
```

> 常见事故：`'test_report.txt'.strip('test_')` 得到 `'report.tx'`（尾部的 `t` 也被吃掉了）。去固定前后缀请用 `removeprefix`/`removesuffix` 或切片。

### 拆分与连接

```python
line = 'name,age,,city'
print(line.split(','))              # => ['name', 'age', '', 'city']
print(line.split(',', 1))           # => ['name', 'age,,city']   限制切分次数
print(line.rsplit(',', 1))          # => ['name,age,', 'city']   取最后一段常用

print('a  b\tc'.split())            # => ['a', 'b', 'c']   无参数：按任意连续空白
print('第一行\n第二行\r\n第三行'.splitlines())   # => ['第一行', '第二行', '第三行']

# partition：一刀切三段，永远返回 3 元组，适合解析 key=value
print('k=v=v2'.partition('='))      # => ('k', '=', 'v=v2')
print('novalue'.partition('='))     # => ('novalue', '', '')   不用判断长度
print('a/b/c'.rpartition('/'))      # => ('a/b', '/', 'c')

print('-'.join(['2026', '09', '03']))       # => 2026-09-03
print(''.join(str(x) for x in range(5)))    # => 01234   非字符串要先转
```

> `join` 的元素必须全是 `str`，混入 `int` 会抛 `TypeError: sequence item 0: expected str instance, int found`。

### 替换：replace 与 translate

```python
s = 'a-b-c-d'
print(s.replace('-', '+'))          # => a+b+c+d
print(s.replace('-', '+', 2))       # => a+b+c-d   只替换前 2 个
print(s.replace('-', ''))           # => abcd      删除等于替换成空串

# 多字符批量映射用 translate，比链式 replace 快得多
table = str.maketrans('abc', 'ABC')
print('aabbcc'.translate(table))            # => AABBCC

# 第三个参数是"要删除的字符"
table2 = str.maketrans('', '', 'aeiou')
print('beautiful'.translate(table2))        # => btfl

# 也支持多字符映射到字符串
table3 = str.maketrans({'<': '&lt;', '>': '&gt;'})
print('<b>'.translate(table3))              # => &lt;b&gt;
```

---

## 三、字符串格式化

```python
name, score = '小明', 95.5

'%s 考了 %.1f 分' % (name, score)          # 1. 老式 %（不推荐）
'{} 考了 {:.1f} 分'.format(name, score)    # 2. str.format
f'{name} 考了 {score:.1f} 分'              # 3. f-string（推荐，3.6+）
```

### 方式一：`%` 操作符

C 风格，遗留代码里最常见。占位符：`%s`（str）、`%d`（整数）、`%f`（浮点）、`%.2f`、`%x`（十六进制）、`%%`（百分号本身）。

```python
print('%05.2f%%' % 3.14159)         # => 03.14%
print('%-10s|' % 'left')            # => left      |
print('%(n)s 今年 %(a)d 岁' % {'n': '小明', 'a': 18})   # => 小明 今年 18 岁
```

两个坑：**只有一个元组参数时必须写成 `% (x,)`**，否则元组会被展开；并且 `%d` 传字符串直接报错。

```python
t = (1, 2)
# print('%s' % t)                   # TypeError: not all arguments converted
print('%s' % (t,))                  # => (1, 2)
```

### 方式二：`str.format`

```python
print('{} {}'.format('a', 'b'))             # => a b        自动编号
print('{1} {0}'.format('a', 'b'))           # => b a        手动编号
print('{n} 岁 {n}'.format(n=18))            # => 18 岁 18   关键字，可重复
print('{0[1]}'.format(['x', 'y']))          # => y          索引取值
print('{p.real}'.format(p=1+2j))            # => 1.0        属性取值
print('{:{w}.{p}f}'.format(3.14159, w=8, p=2))   # =>     3.14   宽度/精度也能参数化

d = {'k': 'v'}
print('{k}'.format(**d))                    # => v          解包字典
```

`format` 至今仍有一个不可替代的场景：**模板字符串来自配置文件或数据库**（此时没法写 f-string）。

### 方式三：f-string 常用技巧

```python
f'{score:.2f}'          # 保留两位小数      → '95.50'
f'{1234567:,}'          # 千分位            → '1,234,567'
f'{0.256:.1%}'          # 百分比            → '25.6%'
f'{"hi":>10}'           # 右对齐宽度 10
f'{name=}'              # 调试神器（3.8+）  → "name='小明'"
f'{value!r}'            # 调用 repr()
```

> f-string 在**运行时求值**，速度最快、可读性最好，新项目一律用它。

更多实战写法：

```python
import datetime
w, n, pi = 12, 1234567.891, 3.14159

print(f'{n:,.2f}')              # => 1,234,567.89     千分位 + 两位小数
print(f'{n:_.0f}')              # => 1_234_568        下划线分隔
print(f'{pi:{w}.3f}|')          # =>        3.142|    宽度用变量嵌入
print(f'{42:08.3f}')            # => 0042.000
print(f'{255:#x} {255:b} {255:o}')      # => 0xff 11111111 377
print(f'{-5:+d} {5:+d}')                # => -5 +5     强制显示符号
print(f'{"标题":=^20}')                  # => =======标题=======  居中填充
print(f'{datetime.date(2026,9,3):%Y年%m月%d日}')   # => 2026年09月03日
print(f'{[1,2]!s} {[1,2]!r}')           # => [1, 2] [1, 2]

items = {'a': 1}
print(f'{items["a"]}')          # => 1   内层引号要与外层不同（3.12 前）

# 3.8+ 的自文档表达式：把表达式原文一起打出来，调试极好用
x = 7
print(f'{x * 2 = }')            # => x * 2 = 14
```

### 格式规格迷你语言

统一格式：`{字段:[[填充]对齐][符号][#][0][宽度][分组][.精度][类型]}`

| 片段 | 含义 |
| --- | --- |
| `<` `>` `^` | 左对齐 / 右对齐 / 居中 |
| `=` | 符号后填充（仅数字） |
| `+` `-` ` ` | 符号显示策略 |
| `,` `_` | 千位分组符 |
| `.n` | 浮点精度 / 字符串截断长度 |
| `f` `e` `g` | 定点 / 科学计数 / 通用 |
| `d` `b` `o` `x` `X` | 十 / 二 / 八 / 十六进制 |
| `%` | 乘 100 并加百分号 |

### 三种方式对比

| 维度 | `%` | `str.format` | f-string |
| --- | --- | --- | --- |
| 版本 | 全部 | 2.6+ | 3.6+ |
| 可读性 | 差（参数与占位分离） | 中 | 最好 |
| 性能 | 中 | 最慢 | 最快（编译期展开） |
| 模板可延迟渲染 | 支持 | 支持 | 不支持 |
| 推荐度 | 仅维护旧代码 | 动态模板 | 日常首选 |

> 一个例外：**日志不要用 f-string**。`logging.info('x=%s', x)` 会在日志级别不输出时跳过格式化，而 f-string 无论如何都会先算一遍字符串。

---

## 四、拼接：join 还是 + ？

```python
# ❌ 循环里用 + ：每次生成新字符串并拷贝，O(n²)
result = ''
for part in parts:
    result += part

# ✅ 一次性 join：O(n)
result = ''.join(parts)
```

数据量小的时候差别不明显，但一旦进入循环，一定要用 `join`。如果 `parts` 不是字符串，先 `''.join(str(x) for x in parts)`。

### 为什么 `+` 是 O(n²)

第 k 次拼接要把已有的 k 个字符全部拷贝一遍，总拷贝量是 `1+2+...+n`，即 O(n²)。而 `join` 会先遍历一遍算出总长度，一次性申请内存再逐段拷入，总拷贝量 O(n)。

```python
import time

parts = ['x'] * 200000

t0 = time.perf_counter()
s = ''
for p in parts:
    s += p
t1 = time.perf_counter()

s2 = ''.join(parts)
t2 = time.perf_counter()

print(f'+= : {t1-t0:.4f}s')      # => 量级明显更大（且随规模平方增长）
print(f'join: {t2-t1:.4f}s')     # => 通常是毫秒级
```

### 四种拼接方式的适用场景

```python
import io

# 1. + / += ：只适合两三个已知片段
full = 'a' + 'b' + 'c'

# 2. join：片段已经在列表/生成器里 —— 首选
full = ''.join(['a', 'b', 'c'])

# 3. list.append 收集 + 一次 join：边算边拼的标准写法
buf = []
for i in range(3):
    buf.append(str(i))
full = ''.join(buf)             # => '012'

# 4. io.StringIO：类文件接口，适合层层传递的"写入者"
sio = io.StringIO()
for i in range(3):
    sio.write(str(i))
full = sio.getvalue()           # => '012'
print(full)
```

> `io.StringIO` 与 `list + join` 性能接近，优势在于它是**文件式 API**，可以直接交给 `print(file=...)`、`json.dump(fp=...)` 等接受文件对象的函数。

### intern 机制（字符串驻留）

CPython 会把**编译期确定、且形如标识符**（字母数字下划线）的短字符串放入内部字典复用，使相同内容共用一个对象——这让 `==` 在多数情况下退化成一次指针比较。

```python
import sys

a = 'hello'
b = 'hello'
print(a is b)                   # => True    编译期驻留

c = 'hello world'
d = 'hello world'
print(c is d)                   # => 交互式下常为 False（含空格，不自动驻留）

e = ''.join(['he', 'llo'])
print(e == a, e is a)           # => True False   运行时构造，未驻留

f = sys.intern(''.join(['he', 'llo']))
print(f is a)                   # => True    手动驻留
```

> 面试要点：**判断字符串内容相等永远用 `==`，绝不用 `is`**。`is` 的结果依赖驻留这种实现细节，在不同 Python 版本、不同上下文（函数内 vs 交互式）里都可能变化。海量重复字符串（如日志字段名）可以用 `sys.intern` 压内存。

---

## 五、编码：str 与 bytes

```python
'中文'.encode('utf-8')            # str → bytes: b'\xe4\xb8\xad\xe6\x96\x87'
b'\xe4\xb8\xad'.decode('utf-8')   # bytes → str: '中'
```

- **Python 3 中 `str` 是 Unicode 文本，`bytes` 是二进制序列**，两者不能混用
- 乱码的唯一原因：**编码与解码用的字符集不一致**
- 文件读写、网络传输都是 `bytes`；程序内部处理用 `str`
- `open(..., encoding='utf-8')` 一定要显式指定，Windows 默认 GBK 极易踩坑

### 码点：ord 与 chr

Unicode 给每个字符分配一个整数编号（码点，写作 `U+4E2D`）。`str` 就是"码点序列"，与具体字节无关。

```python
print(ord('A'), ord('中'))          # => 65 20013
print(chr(65), chr(0x4e2d))         # => A 中
print(hex(ord('中')))               # => 0x4e2d
print('\u4e2d' == '中')             # => True
print([ord(c) for c in 'Hi中'])     # => [72, 105, 20013]
```

### UTF-8 与 UTF-16 的区别

**编码**决定码点怎么落成字节：

| 编码 | 规则 | ASCII 兼容 | `'中'` 占用 |
| --- | --- | --- | --- |
| UTF-8 | 变长 1-4 字节 | 兼容 | 3 字节 |
| UTF-16 | 变长 2 或 4 字节，带 BOM | 不兼容 | 2 字节（+2 BOM） |
| UTF-32 | 定长 4 字节 | 不兼容 | 4 字节 |
| GBK | 变长 1-2 字节，仅中文 | 兼容 | 2 字节 |

```python
s = 'A中'
print(s.encode('utf-8'))            # => b'A\xe4\xb8\xad'          3+1=4 字节
print(s.encode('utf-16'))           # => b'\xff\xfeA\x00-N'        含 BOM
print(s.encode('utf-16le'))         # => b'A\x00-N'                无 BOM
print(s.encode('gbk'))              # => b'A\xd6\xd0'
print(len(s), len(s.encode('utf-8')))   # => 2 4   字符数 != 字节数
```

要点：**UTF-8 是网络与文件交换的事实标准**（ASCII 兼容、无字节序问题）；UTF-16 主要出现在 Windows API 和 Java 内部；`len(str)` 数的是字符，`len(bytes)` 数的是字节。

### encode / decode 与两类异常

```python
s = '中文abc'
b = s.encode('utf-8')
print(type(b), b)                   # => <class 'bytes'> b'\xe4\xb8\xad\xe6\x96\x87abc'
print(b.decode('utf-8'))            # => 中文abc

# 1) UnicodeEncodeError：目标字符集装不下这个字符
try:
    '中'.encode('ascii')
except UnicodeEncodeError as e:
    print('编码失败:', e.reason)     # => 编码失败: ordinal not in range(128)

# 2) UnicodeDecodeError：字节序列不符合该编码的规则
try:
    b'\xe4\xb8'.decode('utf-8')     # UTF-8 三字节序列被截断
except UnicodeDecodeError as e:
    print('解码失败:', e.reason)     # => 解码失败: unexpected end of data
```

### errors 参数：容错策略

| 取值 | 行为 |
| --- | --- |
| `strict` | 默认，直接抛异常 |
| `ignore` | 丢弃非法字符（静默丢数据） |
| `replace` | 替换成 `?` 或 `U+FFFD` |
| `backslashreplace` | 换成 `\xNN` 形式，可逆 |
| `xmlcharrefreplace` | 换成 XML 字符引用（仅 encode） |
| `surrogateescape` | 把非法字节暂存为代理码点，可原样写回 |

```python
s = '中文abc'
print(s.encode('ascii', errors='ignore'))            # => b'abc'
print(s.encode('ascii', errors='replace'))           # => b'???abc'
print(s.encode('ascii', errors='backslashreplace'))  # => b'\\u4e2d\\u6587abc'
print(b'a\xffb'.decode('utf-8', errors='replace'))   # => a?b（实际是 U+FFFD）
```

> 生产建议：**日志/展示用 `replace`，数据处理用 `strict` 让问题暴露**。`ignore` 会悄悄丢字符，最难排查。

### bytes 与 str 千万别混用

```python
b = b'abc'
s = 'abc'
print(b == s)                       # => False   永远不相等，且不报错，最坑
# print(b + s)                      # TypeError: can't concat str to bytes

print(b'abc'[0])                    # => 97      索引 bytes 得到 int！
print(b'abc'[0:1])                  # => b'a'    切片才还是 bytes
print(list(b'ab'))                  # => [97, 98]

print(bytes([228, 184, 173]).decode('utf-8'))   # => 中
print(bytearray(b'abc'))            # => bytearray(b'abc')   可变版本
```

界面很清楚：**在系统边界（文件、socket、数据库驱动）做 encode/decode，内部一律用 `str`**。

### 文件读写与编码检测

```python
# 文本模式：encoding 必须显式写，否则跟随系统（Windows 常是 GBK/cp936）
with open('a.txt', 'w', encoding='utf-8', newline='\n') as f:
    f.write('中文\n')

with open('a.txt', encoding='utf-8') as f:
    print(f.read().strip())         # => 中文

# 二进制模式：不做任何编码转换，得到 bytes
with open('a.txt', 'rb') as f:
    raw = f.read()
print(raw)                          # => b'\xe4\xb8\xad\xe6\x96\x87\n'

# 编码未知时的探测思路（需 pip install chardet）
# import chardet
# print(chardet.detect(raw))        # => {'encoding': 'utf-8', 'confidence': 0.99, ...}

# 带 BOM 的 UTF-8 用 utf-8-sig 读，否则首字符会多出 '\ufeff'
print('\ufeff中'.encode('utf-8-sig') == '中'.encode('utf-8-sig'))   # => False
```

---

## 六、高频面试题

**Q1：字符串不可变，那 `s += 'a'` 为什么能成功？**

这不是修改原对象，而是**创建新字符串并让变量 `s` 重新指向它**（`id(s)` 会变）。原对象等待垃圾回收。

**Q2：`join` 和 `+` 拼接的区别？**

`join` 一次计算总长度后一次性分配，时间复杂度 O(n)；循环里的 `+` 每次都要拷贝整个字符串，复杂度 O(n²)。**循环拼接必须用 `join`**。

**Q3：如何反转字符串？**

```python
s = 'abc'
print(s[::-1])                        # => cba   最常用，C 层实现最快
print(''.join(reversed(s)))           # => cba   可读性好，reversed 返回迭代器

# 进阶：按单词反转
print(' '.join('a b c'.split()[::-1]))   # => c b a
```

**Q4：`split()` 和 `split(' ')` 的区别？**

```python
'a  b'.split()      # ['a', 'b']      无参数：按任意连续空白切分，忽略首尾空白
'a  b'.split(' ')   # ['a', '', 'b']  指定分隔符：连续分隔符会产生空字符串
```

**Q5：产生乱码的原因？**

编码和解码使用了不同的字符集。排查思路：确认源头编码（文件头、HTTP 响应头 `charset`）→ 全程统一使用 UTF-8 → 读文件/接口时显式传 `encoding`。

**Q6：`strip()` 能去掉字符串中间的空格吗？**

不能，只处理**两端**。`' a b '.strip()` → `'a b'`。去掉全部空格用 `replace(' ', '')`，去掉所有空白用 `''.join(s.split())`。

**Q7：什么是字符串驻留（intern）？**

CPython 对仅由字母、数字、下划线组成的字符串做缓存复用，让相同内容指向同一对象，节省内存并加快比较。可用 `sys.intern()` 手动驻留。**因此比较内容必须用 `==` 而不是 `is`**。

**Q8：如何统计每个字符/单词出现的次数？**

```python
from collections import Counter

print(Counter('hello'))                 # => Counter({'l': 2, 'h': 1, 'e': 1, 'o': 1})

text = 'the quick the lazy the dog'
c = Counter(text.lower().split())
print(c.most_common(2))                 # => [('the', 3), ('quick', 1)]

# 不用 Counter 的写法（面试可能要求手写）
d = {}
for w in text.split():
    d[w] = d.get(w, 0) + 1
print(d['the'])                         # => 3
```

**Q9：如何判断一个字符串是不是回文？**

```python
def is_palindrome(s):
    s = ''.join(c for c in s.lower() if c.isalnum())    # 忽略大小写与标点
    return s == s[::-1]

print(is_palindrome('A man, a plan, a canal: Panama'))   # => True

# 双指针版本：不额外建串，空间 O(1)
def is_palindrome2(s):
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return False
        i, j = i + 1, j - 1
    return True

print(is_palindrome2('abba'))                            # => True
```

**Q10：三引号的作用？**

定义**多行字符串**（保留换行和缩进），也是写文档字符串（docstring）的标准方式。

**Q11：最长无重复字符子串怎么求？**

滑动窗口 + 哈希表记录每个字符最后出现的位置，时间 O(n)、空间 O(字符集)。

```python
def longest_unique(s):
    last = {}          # 字符 → 最后一次出现的下标
    start = best = 0    # 窗口左边界、答案长度
    for i, c in enumerate(s):
        if c in last and last[c] >= start:
            start = last[c] + 1        # 左边界跳到重复字符的下一位
        last[c] = i
        best = max(best, i - start + 1)
    return best

print(longest_unique('abcabcbb'))      # => 3   'abc'
print(longest_unique('pwwkew'))        # => 3   'wke'
```

**Q12：`is` 和 `==` 比较字符串有什么区别？**

`==` 比内容（调用 `__eq__`），`is` 比对象身份（`id`）。因为有驻留优化，短字面量 `is` 常常也返回 True，但这是实现细节，**业务代码只用 `==`**。

**Q13：`str` 和 `bytes` 怎么转，为什么不能直接相加？**

`str.encode(enc)` → `bytes`，`bytes.decode(enc)` → `str`。它们是两种完全不同的类型（文本 vs 二进制），相加抛 `TypeError`；更危险的是 `b'a' == 'a'` 返回 `False` 却不报错。

**Q14：`len('中文')` 是几？占几个字节？**

`len` 数字符，结果是 `2`。字节数取决于编码：UTF-8 下 `len('中文'.encode('utf-8'))` 是 6，GBK 下是 4。

**Q15：字符串去重且保持原顺序？**

```python
s = 'abracadabra'
print(''.join(dict.fromkeys(s)))    # => abrcd   dict 从 3.7 起有序
```

**Q16：怎么判断两个字符串是否为字母异位词（anagram）？**

```python
from collections import Counter
a, b = 'listen', 'silent'
print(sorted(a) == sorted(b))        # => True   O(n log n)
print(Counter(a) == Counter(b))      # => True   O(n)
```

---

## 七、易错点

1. **方法返回新串**：`s.strip()` 不会改变 `s`，必须 `s = s.strip()`
2. **`split` 的空串陷阱**：连续分隔符会产生 `''`，需要先 `filter(None, ...)`
3. **`strip` 是按字符集合去**：`strip('ab')` 去掉两端所有 `a` 和 `b` 字符，不是去掉字符串 `"ab"`；去前后缀用 `removeprefix`/`removesuffix`
4. **编码未显式指定**：`open()` 在 Windows 默认用 GBK，读 UTF-8 文件会报 `UnicodeDecodeError`
5. **`bytes` 与 `str` 拼接**：会抛 `TypeError`；而 `b'a' == 'a'` 不报错但恒为 `False`，更隐蔽
6. **`isdigit` 家族别混用**：验证用户输入是否为整数，最安全的是 `try: int(s)`；`'-1'.isdigit()` 是 `False`
7. **`in` 判断子串是 O(n)**：超大规模文本匹配应考虑正则或专门的搜索结构
8. **用 `is` 比较字符串内容**：依赖驻留，随环境变化，必须改用 `==`
9. **忘记 `r''` 写正则/路径**：`'C:\new'` 里的 `\n` 已经变成换行了
10. **列表字面量漏逗号**：`['a' 'b']` 会静默拼接成 `['ab']`
11. **`join` 的元素含非字符串**：先 `map(str, ...)` 或用生成器表达式转换
12. **日志用 f-string**：应写 `logging.info('%s', x)`，把格式化延迟到真正要输出时
13. **索引 `bytes` 得到 int**：`b'abc'[0]` 是 `97` 不是 `b'a'`，要切片 `b'abc'[0:1]`
14. **带 BOM 的文件**：用 `encoding='utf-8-sig'`，否则首字符是 `'\ufeff'`，比较和 `int()` 都会失败
