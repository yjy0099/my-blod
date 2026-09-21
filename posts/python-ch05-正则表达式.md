---
title: Python 基础笔记 · 第 5 章：正则表达式
date: 2026-09-03
category: Python 基础
tags: [Python, 学习笔记, 面试题, 正则表达式, re 模块]
summary: re 模块全部核心 API、元字符与量词速查、贪婪与非贪婪、分组与命名分组、常用正则模板（手机/邮箱/URL/IP/中文）、灾难性回溯这类性能陷阱，以及 pip 镜像源、requests 发请求与包导入机制，附 22 道高频面试题。
---

## 一、re 模块核心 API

| 函数 | 作用 | 返回 |
| --- | --- | --- |
| `re.match(p, s)` | **从开头**匹配 | Match 或 `None` |
| `re.search(p, s)` | 扫描**整个**字符串找第一个 | Match 或 `None` |
| `re.fullmatch(p, s)` | **整个字符串**完全匹配 | Match 或 `None` |
| `re.findall(p, s)` | 找出所有匹配 | 字符串列表（有分组时返回分组元组列表） |
| `re.finditer(p, s)` | 迭代器版，省内存 | Match 迭代器 |
| `re.sub(p, repl, s, count=0)` | 替换 | 新字符串 |
| `re.subn(p, repl, s)` | 替换并返回次数 | `(新字符串, 次数)` |
| `re.split(p, s, maxsplit=0)` | 按正则切分 | 列表 |
| `re.compile(p, flags)` | 预编译，可复用 | Pattern 对象 |
| `re.escape(s)` | 转义所有特殊字符 | 字符串 |

```python
import re

m = re.search(r'(\d{4})-(\d{2})', '日期：2026-09-03')
m.group()        # '2026-09'   完整匹配
m.group(1)       # '2026'      第 1 个分组
m.groups()       # ('2026', '09')
m.start(), m.end(), m.span()   # 位置信息

re.sub(r'\d+', 'N', 'a1b22c333')        # 'aNbNcN'
re.sub(r'\s+', ' ', 'a   b')            # 合并空白
```

> **`re.sub` 的 `repl` 可以是函数**，接收 Match 返回替换字符串，适合做复杂变换：
> ```python
> re.sub(r'\d+', lambda m: str(int(m.group()) * 2), 'a1b2')   # 'a2b4'
> ```

### match / search / fullmatch 三选一

这三个的差别只在**锚定位置**上，返回值都是 `Match` 或 `None`。

```python
import re

s = 'abc123'
print(re.match(r'\d+', s))            # => None       开头不是数字
print(re.search(r'\d+', s).group())   # => 123        全串扫描
print(re.match(r'[a-z]+', s).group()) # => abc        开头匹配即可，不要求到底
print(re.fullmatch(r'[a-z]+', s))     # => None       要求整串都匹配
print(re.fullmatch(r'[a-z]+\d+', s).group())          # => abc123
```

选择原则：**提取信息用 `search`，格式校验用 `fullmatch`，`match` 只在明确要求"以 X 开头"时用**。

`Match` 是"真值对象"，可以直接放进 `if`；3.8+ 还能用海象运算符一行搞定：

```python
if m := re.search(r'v(\d+)\.(\d+)', 'app v3.11 released'):
    major, minor = m.groups()
    print(major, minor)               # => 3 11
```

### findall vs finditer

```python
import re

log = 'GET /a 200\nPOST /b 404\nGET /c 500'

print(re.findall(r'\d{3}', log))                  # => ['200', '404', '500']
print(re.findall(r'(\w+) (/\w+) (\d{3})', log)[0])# => ('GET', '/a', '200')

# finditer 返回迭代器，能拿到位置信息，且不会一次性构造大列表
for m in re.finditer(r'(\w+) (/\w+) (\d{3})', log):
    print(m.group(3), m.span())       # => 200 (0, 10) / 404 (11, 22) / ...
```

**记住两条**：`findall` 里只要有捕获分组，返回的就是分组（1 个分组 → 字符串列表；多个 → 元组列表）；处理大文本或需要偏移量时用 `finditer`。

### sub / subn / split

```python
import re

# 1) sub：repl 里可用 \1 或 \g<name> 回引分组
print(re.sub(r'(\d{4})-(\d{2})-(\d{2})', r'\3/\2/\1', '2026-09-03'))   # => 03/09/2026
print(re.sub(r'(?P<y>\d{4})年', r'\g<y>-', '2026年'))                   # => 2026-

# 2) count 限制次数
print(re.sub(r'a', 'X', 'aaa', count=2))       # => XXa

# 3) subn 顺便告诉你替换了几次（可用于判断"有没有改动"）
print(re.subn(r'\s+', ' ', 'a  b   c'))        # => ('a b c', 2)

# 4) repl 传函数：做条件替换 / 脱敏 / 大小写转换
def mask(m):
    p = m.group()
    return p[:3] + '****' + p[-4:]
print(re.sub(r'1[3-9]\d{9}', mask, '联系 13812345678 或 13900001111'))
# => 联系 138****5678 或 139****1111

# 5) split：分隔符本身也可以是正则；带分组时分隔符会被保留
print(re.split(r'[,;\s]+', 'a, b;c  d'))       # => ['a', 'b', 'c', 'd']
print(re.split(r'(\d)', 'a1b2c'))              # => ['a', '1', 'b', '2', 'c']
print(re.split(r',', 'a,b,c', maxsplit=1))     # => ['a', 'b,c']
```

> 陷阱：`re.sub` 的 `repl` 是字符串时，里面的 `\` 仍然有特殊含义（`\1`、`\g<1>`、`\\`）。若替换文本来自用户输入，要用 `re.escape` 或改用函数形式，避免 `bad escape` 报错。

### compile 与 Pattern 对象

```python
import re

PHONE = re.compile(r'1[3-9]\d{9}')        # 模块级常量，只编译一次
print(PHONE.search('打 13800138000').group())   # => 13800138000
print(PHONE.findall('13800138000 13911112222'))
print(PHONE.sub('***', 'call 13800138000'))     # => call ***

# Pattern 上的方法支持 pos / endpos 限定搜索范围（模块级函数不支持）
p = re.compile(r'\d+')
print(p.search('abc123def', 5))           # => None   从下标 5 开始已越过数字
print(p.pattern, p.flags)                 # => \d+ 32
```

预编译的价值：**避免重复解析**、可读性更好（给正则起名字）、可用 `pos/endpos`。`re` 内部虽有 512 条的缓存，但缓存会被冲掉，且动态拼接的 pattern 无法命中。

### Match 对象全接口

```python
import re

m = re.search(r'(?P<user>\w+)@(?P<host>[\w.]+)', 'mail: tom@qq.com !')

print(m.group())          # => tom@qq.com     等价 m.group(0)
print(m.group(1, 2))      # => ('tom', 'qq.com')   一次取多个
print(m.groups())         # => ('tom', 'qq.com')
print(m.groupdict())      # => {'user': 'tom', 'host': 'qq.com'}
print(m.group('host'))    # => qq.com         按名字取
print(m.span(), m.start(1), m.end(1))         # => (6, 16) 6 9
print(m.lastindex, m.lastgroup)               # => 2 host
print(m.string[:4])       # => mail          原始字符串
print(m.re.pattern[:6])   # => (?P<us        对应的 Pattern

# 未参与匹配的可选分组返回 None，不是空串
m2 = re.search(r'(a)?(b)', 'b')
print(m2.groups())        # => (None, 'b')
print(m2.group(1) or '')  # => (空串)   取值时习惯给个默认
```

---

## 二、语法速查

### 元字符

| 字符 | 含义 |
| --- | --- |
| `.` | 任意字符（**默认不含换行**，需 `re.S`） |
| `^` ` $` | 字符串开头 / 结尾（`re.M` 下匹配每行） |
| `*` `+` `?` | 重复 0+ / 1+ / 0或1 次 |
| `{m,n}` | 重复 m 到 n 次 |
| `[]` | 字符集合，`[^...]` 表示取反 |
| `\|` | 或 |
| `()` | 分组 |
| `\` | 转义 |
| `\A` `\Z` | 字符串真正的开头 / 结尾（不受 `re.M` 影响） |

```python
import re

print(re.findall(r'^a', 'abc'))            # => ['a']
print(re.findall(r'c$', 'abc'))            # => ['c']
print(re.findall(r'a.c', 'abc a\nc'))      # => ['abc']     . 不吃换行
print(re.findall(r'a.c', 'a\nc', re.S))    # => ['a\nc']    加 re.S 就吃
print(re.findall(r'^b', 'a\nb'))           # => []          ^ 只认全串开头
print(re.findall(r'^b', 'a\nb', re.M))     # => ['b']       re.M 下认行首
print(re.findall(r'\Ab', 'a\nb', re.M))    # => []          \A 不受 re.M 影响
print(re.findall(r'cat|dog', 'a cat, a dog'))    # => ['cat', 'dog']
```

> `$` 有个细节：它能匹配**末尾换行之前**的位置。`re.search(r'c$', 'abc\n')` 是能匹配上的，严格要求结尾请用 `\Z`。

### 预定义字符类

`\d` 数字 ｜ `\D` 非数字 ｜ `\w` 单词字符（字母数字下划线）｜ `\W` ｜ `\s` 空白 ｜ `\S` ｜ `\b` 单词边界 ｜ `\B`

> Python 3 的 `str` 正则默认是 Unicode 语义，`\d` 会匹配全角数字 `'１'`、`\w` 会匹配中文；想退回 ASCII 语义加 `re.A`。匹配中文最稳的还是显式写 `[\u4e00-\u9fa5]`。

```python
import re

print(re.findall(r'\d', '1１'))              # => ['1', '１']   全角也算数字！
print(re.findall(r'\d', '1１', re.A))        # => ['1']        ASCII 模式
print(re.findall(r'\w+', 'a_1 中文'))        # => ['a_1', '中文']
print(re.findall(r'\w+', 'a_1 中文', re.A))  # => ['a_1']
print(re.findall(r'\s+', 'a \t\nb'))         # => [' \t\n']
```

`\b` 是**零宽**的单词边界（`\w` 与 `\W` 的交界处），做"整词匹配"离不开它：

```python
import re

s = 'cat category concat'
print(re.findall(r'cat', s))          # => ['cat', 'cat', 'cat']   三个都中
print(re.findall(r'\bcat\b', s))      # => ['cat']                 只要独立单词
print(re.sub(r'\bis\b', 'was', 'this is it'))    # => this was it
print(re.findall(r'\Bcat', s))        # => ['cat']                 非边界处的 cat
```

### 字符类 `[...]` 的规则

```python
import re

print(re.findall(r'[aeiou]', 'hello'))          # => ['e', 'o']
print(re.findall(r'[^aeiou\s]', 'hi you'))      # => ['h', 'y']   ^ 在首位表取反
print(re.findall(r'[a-zA-Z0-9_]+', 'a_B9-c'))   # => ['a_B9', 'c']  等价 \w（ASCII）
print(re.findall(r'[\d\-]+', 'a1-2b'))          # => ['1-2']      类内也能用 \d
print(re.findall(r'[.*+]', 'a.b*c'))            # => ['.', '*']   类内元字符失效
print(re.findall(r'[a^]', 'a^'))                # => ['a', '^']   ^ 不在首位就是字面量
print(re.findall(r'[]]', 'a]'))                 # => [']']        ] 放首位不用转义
```

要点：**方括号内绝大多数元字符（`. * + ? ( )`）自动失去特殊含义**，只需关心 `^`（首位取反）、`-`（范围，放首尾即字面量）、`]`、`\`。这也是为什么 `[^>]*` 比 `.*?` 更安全高效。

### 量词与贪婪性

| 量词 | 次数 | 懒惰写法 |
| --- | --- | --- |
| `*` | 0 或多次 | `*?` |
| `+` | 1 或多次 | `+?` |
| `?` | 0 或 1 次 | `??` |
| `{m}` | 恰好 m 次 | 无意义 |
| `{m,}` | 至少 m 次 | `{m,}?` |
| `{,n}` | 最多 n 次 | `{,n}?` |
| `{m,n}` | m 到 n 次 | `{m,n}?` |

```python
import re

print(re.findall(r'\d{3}', '12 345 6789'))       # => ['345', '678']
print(re.findall(r'\b\d{3}\b', '12 345 6789'))   # => ['345']   加边界才准
print(re.findall(r'a{2,}', 'a aa aaa'))          # => ['aa', 'aaa']
print(re.findall(r'colou?r', 'color colour'))    # => ['color', 'colour']
print(re.fullmatch(r'\d{6}(\d{2})?', '12345678').groups())   # => ('78',)
```

> 注意 `{m,n}` 中间**不能有空格**，`a{1, 3}` 会被当成普通字符串字面量匹配，是新手常见静默错误。

### 常用标志

| 标志 | 全名 | 作用 |
| --- | --- | --- |
| `re.I` | IGNORECASE | 忽略大小写 |
| `re.M` | MULTILINE | 多行模式，`^` `$` 匹配每行首尾 |
| `re.S` | DOTALL | 让 `.` 匹配包括换行在内的所有字符 |
| `re.X` | VERBOSE | 详细模式，允许加空白和注释，便于写复杂正则 |
| `re.A` | ASCII | `\w \d \s` 退回 ASCII 语义 |
| `re.U` | UNICODE | Unicode 语义（Python 3 默认，无需写） |

多个标志用 `|` 组合；也可以写在 pattern 内联：

```python
import re

print(re.findall(r'^ab.$', 'AB\nx\nabZ', re.I | re.M | re.S))   # => ['abZ']
print(re.findall(r'(?i)abc', 'ABC'))     # => ['ABC']   内联标志，等价 re.I

# re.X：把长正则拆开写注释，可维护性质变
DATE = re.compile(r'''
    (?P<y>\d{4})      # 年
    [-/]              # 分隔符
    (?P<m>0[1-9]|1[0-2])   # 月
    [-/]
    (?P<d>0[1-9]|[12]\d|3[01])   # 日
''', re.X)
print(DATE.search('2026/09/03').groupdict())   # => {'y': '2026', 'm': '09', 'd': '03'}
```

> `re.X` 模式下**空白会被忽略**，要匹配真正的空格必须写 `\ `、`[ ]` 或 `\s`。

### 转义、raw 字符串与 re.escape

```python
import re

# 1) 为什么必须 r''：Python 先解释一遍转义，剩下的才交给 re
print(len('\d'), len(r'\d'))          # => 2 2   ('\d' 非法转义，3.12+ 会告警)
print('\\d' == r'\d')                 # => True
print(len('\n'), len(r'\n'))          # => 1 2   这里差别就出来了
print(re.findall(r'\n', 'a\nb'))      # => ['\n']   r'\n' 传给 re 后仍表示换行

# 2) 匹配字面反斜杠：正则要两个，raw 串里写两个
print(re.findall(r'\\', r'C:\x'))     # => ['\\']

# 3) 用户输入必须 escape，否则 '.' '(' 会被当成语法
kw = 'a.b(c)'
# re.search(kw, 'xa.b(c)y')           # 语义错误：. 匹配任意字符
print(re.search(re.escape(kw), 'xa.b(c)y').group())   # => a.b(c)
print(re.escape('a.b*c'))             # => a\.b\*c
```

---

## 三、贪婪 vs 非贪婪

量词默认是**贪婪**的（尽可能多匹配），在量词后加 `?` 变成**非贪婪**（尽可能少匹配）。

```python
s = '<a>1</a><b>2</b>'
re.findall(r'<.*>', s)     # ['<a>1</a><b>2</b>']   贪婪：一路吃到最后一个 >
re.findall(r'<.*?>', s)    # ['<a>', '</a>', '<b>', '</b>']   非贪婪
```

**匹配 HTML/XML 这类嵌套结构时，第一时间想到非贪婪。**

### 引擎是怎么工作的

Python 的 `re` 是**回溯型（NFA）引擎**：贪婪量词先一口吃到最长，然后为了让后面的部分匹配上，一个字符一个字符地"吐回来"（回溯）；懒惰量词相反，先吃最少，不行再一个个多吃。

```text
目标串:  <a>1</a>
模式:    <.*>
步骤:    .* 先吃掉 "a>1</a>"  →  需要 '>' 但已到末尾  →  回吐一位…
         直到 .* = "a>1</a" 时其后是 '>'  →  匹配成功 "<a>1</a>"
```

由此可推出三条经验：

1. 想要"最短片段"用 `.*?`。
2. **能用否定字符类就别用 `.`** ——`<[^>]*>` 一次直达，几乎不回溯，比 `<.*?>` 更快也更准。
3. 贪婪不是错，取"最后一个"分隔符后的内容时贪婪反而正确。

```python
import re

path = '/usr/local/bin/python'
print(re.match(r'.*/', path).group())     # => /usr/local/bin/   贪婪，取最后一个 /
print(re.match(r'.*?/', path).group())    # => /                懒惰，取第一个

html = '<a href="x">link</a>'
print(re.findall(r'<[^>]*>', html))       # => ['<a href="x">', '</a>']   推荐写法
print(re.findall(r'"(.*?)"', html))       # => ['x']            提取引号内内容
```

### 独占/原子效果的替代写法

Python 3.11+ 支持原子组 `(?>...)` 和独占量词 `*+`；旧版本可以用"精确字符类 + 锚定"达到同样目的。

```python
import re
# 3.11+ ：一旦匹配就不再回吐
# print(re.match(r'(?>\d+)abc', '123abc'))

# 通用替代：把 .* 换成不可能与后续冲突的字符类
print(re.fullmatch(r'\d+[a-z]+', '123abc').group())   # => 123abc
```

---

## 四、分组

```python
r'(ab)+'              # 捕获分组，可用 \1 或 m.group(1) 引用
r'(?:ab)+'            # 非捕获分组：只分组不占编号，性能略好
r'(?P<year>\d{4})'    # 命名分组
r'(?P=year)'          # 命名分组的反向引用
r'\1'                 # 按编号的反向引用
```

### 捕获、非捕获与编号规则

分组编号按**左括号出现顺序**从 1 开始，嵌套分组也照此规则。

```python
import re

m = re.search(r'((\d{4})-(\d{2}))', '2026-09')
print(m.group(0))       # => 2026-09    整体
print(m.group(1))       # => 2026-09    最外层分组
print(m.group(2), m.group(3))    # => 2026 09

# 只想分组不想捕获 → (?:...)
print(re.findall(r'(?:ab)+', 'ababab cd'))       # => ['ababab']
print(re.findall(r'(ab)+', 'ababab'))            # => ['ab']   注意：返回的是分组！

# 分组 + | 控制作用范围
print(re.findall(r'^(?:GET|POST) /\w+', 'POST /login', re.M))   # => ['POST /login']
```

### 命名分组：让正则可读可维护

```python
import re

LOG = re.compile(
    r'(?P<ip>\d+\.\d+\.\d+\.\d+)\s+'
    r'(?P<method>GET|POST)\s+'
    r'(?P<path>\S+)\s+'
    r'(?P<code>\d{3})'
)
m = LOG.search('10.0.0.1 GET /api/user 200')
print(m.group('code'))      # => 200
print(m.groupdict())        # => {'ip': '10.0.0.1', 'method': 'GET', 'path': '/api/user', 'code': '200'}

# 替换时用 \g<name> 引用
print(LOG.sub(r'\g<method> \g<path>', '10.0.0.1 GET /api/user 200'))   # => GET /api/user
```

> 命名分组是**工程正则的标配**：加一个分组不会打乱下游代码的编号，`groupdict()` 还能直接喂给 `dict`/`dataclass`。

### 后向引用 `\number`

反向引用表示"再次出现**和前面那个分组捕获到的内容完全相同**的文本"，用于查重复。

```python
import re

# 1) 连续重复的单词
print(re.findall(r'\b(\w+)\s+\1\b', 'the the cat sat sat down'))   # => ['the', 'sat']
print(re.sub(r'\b(\w+)( \1\b)+', r'\1', 'the the cat'))            # => the cat

# 2) 成对的引号/标签
print(re.findall(r'(["\'])(.*?)\1', 'a="x", b=\'y\''))   # => [('"', 'x'), ("'", 'y')]
print(re.search(r'<(\w+)>.*?</\1>', '<b>hi</b>').group())          # => <b>hi</b>

# 3) 叠字判断
print(bool(re.search(r'(.)\1', 'hello')))                # => True   有 'll'
```

### 断言（零宽环视）

断言**不消耗字符**，只对"当前位置的左右文"做条件判断，是提取"满足某种上下文的内容"的利器。

| 语法 | 名称 | 含义 |
| --- | --- | --- |
| `(?=...)` | 前瞻（lookahead） | 右边**必须**匹配 |
| `(?!...)` | 否定前瞻 | 右边**不能**匹配 |
| `(?<=...)` | 后顾（lookbehind） | 左边**必须**匹配 |
| `(?<!...)` | 否定后顾 | 左边**不能**匹配 |

```python
import re

s = '价格 $30，运费 15元，折扣 8元'

print(re.findall(r'\d+(?=元)', s))        # => ['15', '8']    前瞻：后面是"元"
print(re.findall(r'\d+(?!元)', s))        # => ['30', '1', '']  否定前瞻要小心！
print(re.findall(r'(?<=\$)\d+', s))       # => ['30']         后顾：前面是 $
print(re.findall(r'(?<!\$)\b\d+', s))     # => ['15', '8']    否定后顾 + 边界

# 千位分隔：在"后面是 3 的倍数个数字且到结尾"的位置插逗号
print(re.sub(r'(?<=\d)(?=(\d{3})+$)', ',', '1234567'))    # => 1,234,567

# 密码强度校验：多个前瞻串联表达"同时满足多个条件"
PWD = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$')
print(bool(PWD.match('Abcd123!')))        # => True
print(bool(PWD.match('abcd1234')))        # => False   缺大写和符号

# 排除某些词：匹配不以 test 开头的文件名
print(re.findall(r'^(?!test)\w+\.py$', 'main.py', re.M))  # => ['main.py']
```

> Python 的**后顾要求定宽**：`(?<=ab)` 可以，`(?<=a+)`、`(?<=ab|abc)`（长度不一致）会抛 `re.error: look-behind requires fixed-width pattern`。变长场景改用前瞻或 `\K` 思路（Python 无 `\K`，一般改成捕获分组）。

`\d+(?!元)` 返回 `['30', '1', '']` 这种诡异结果的原因值得记牢：`15` 的 `1` 后面不是"元"，于是引擎在 `1` 处就成功了。**否定前瞻常常要配 `\b` 或改用否定字符类**：

```python
import re
print(re.findall(r'\b\d+\b(?!元)', '15元 30 8元'))   # => ['30']
```

---

## 五、常用正则模板

```python
手机号   r'1[3-9]\d{9}'
邮箱     r'[\w.+-]+@[\w-]+(\.[\w-]+)+'
URL      r'https?://[^\s]+'
IPv4     r'((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)'
日期     r'\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])'
中文     r'[\u4e00-\u9fa5]+'
身份证   r'\d{17}[\dXx]'
去HTML   r'<[^>]+>'
去重空白 r'\s+'
```

> 校验类正则记得配合 `re.fullmatch`，否则 `1[3-9]\d{9}` 会从 `'a13800138000b'` 里"搜出"一个手机号。

### 校验：手机号与邮箱

```python
import re

PHONE = re.compile(r'1[3-9]\d{9}')
for x in ['13800138000', '12345678901', 'a13800138000b']:
    print(x, bool(PHONE.fullmatch(x)))
# => 13800138000 True / 12345678901 False / a13800138000b False

EMAIL = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')   # 用 (?:) 免得污染 findall
for x in ['tom@qq.com', 'a.b+c@mail.co.uk', 'bad@@x.com']:
    print(x, bool(EMAIL.fullmatch(x)))
# => tom@qq.com True / a.b+c@mail.co.uk True / bad@@x.com False
```

> 邮箱的完整 RFC 正则有几百字符，工程上**只做粗校验 + 发验证邮件**才是正确做法，不要迷信"史上最强邮箱正则"。

### 提取：URL、数字、中文

```python
import re

text = '访问 https://a.com/p?id=1 或 http://b.cn，价格 -12.5 和 3 元，作者：张三'

print(re.findall(r'https?://[^\s，,。]+', text))
# => ['https://a.com/p?id=1', 'http://b.cn']

print(re.findall(r'-?\d+\.?\d*', text))        # => ['1', '-12.5', '3']
print(re.findall(r'-?\d+(?:\.\d+)?', text))    # => ['1', '-12.5', '3']   更严谨
print(re.findall(r'[\u4e00-\u9fa5]+', text))   # => ['访问', '或', '价格', '和', '元', '作者', '张三']

# 拆 URL 各部分（命名分组版）
URL = re.compile(r'(?P<scheme>https?)://(?P<host>[^/:\s]+)(?::(?P<port>\d+))?(?P<path>/[^\s?]*)?')
print(URL.search('https://a.com:8080/x/y?q=1').groupdict())
# => {'scheme': 'https', 'host': 'a.com', 'port': '8080', 'path': '/x/y'}
```

### 替换：敏感词与脱敏

```python
import re

WORDS = ['傻瓜', '笨蛋', '垃圾']
# 用 | 拼一条正则，一次扫描搞定所有词；escape 防止词里有特殊字符
BAN = re.compile('|'.join(map(re.escape, WORDS)))

text = '你这个傻瓜，真是笨蛋'
print(BAN.sub('**', text))                                 # => 你这个**，真是**
print(BAN.sub(lambda m: '*' * len(m.group()), text))       # => 你这个**，真是**
print(BAN.subn('**', text)[1])                             # => 2   命中次数

# 身份证脱敏：保留前 6 后 4
print(re.sub(r'(\d{6})\d{8}(\d{3}[\dXx])', r'\1********\2', '110101199001011234'))
# => 110101********1234

# 银行卡按 4 位分组
print(re.sub(r'(\d{4})(?=\d)', r'\1 ', '6222021234567890'))   # => 6222 0212 3456 7890
```

### 文本清洗小工具箱

```python
import re

html = '<p>Hello   <b>World</b></p>\n\n\n<br/>'
print(re.sub(r'<[^>]+>', '', html))          # => Hello   World\n\n\n
print(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html)).strip())   # => Hello World
print(re.sub(r'\n{3,}', '\n\n', 'a\n\n\n\n\nb'))   # => a\n\nb   压缩空行

# 驼峰 → 蛇形
print(re.sub(r'(?<!^)(?=[A-Z])', '_', 'HTTPResponseCode').lower())
# => h_t_t_p_response_code   （粗暴版）
print(re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', 'getUserName').lower())   # => get_user_name
```

---

## 六、工程补充：pip 镜像源、requests 与包

正则的典型搭档是「抓取文本 → 清洗 → 提取」，所以补上实际写代码绕不开的三件事。

### 1. pip 镜像源配置

国内直连 PyPI 经常超时，换成国内镜像是标准做法。

```bash
# 临时使用（单次生效）
pip install requests -i https://pypi.tuna.tsinghua.edu.cn/simple

# 永久配置（推荐，写入 pip 配置文件）
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 查看当前配置
pip config list
```

| 镜像 | 地址 |
| --- | --- |
| 清华 TUNA | `https://pypi.tuna.tsinghua.edu.cn/simple` |
| 阿里云 | `https://mirrors.aliyun.com/pypi/simple/` |
| 中科大 | `https://pypi.mirrors.ustc.edu.cn/simple/` |

### 2. requests：发 HTTP 请求

`requests` 是第三方库，需先 `pip install requests`（标准库的 `urllib` 难用得多）。

```python
import requests

# GET 带查询参数
resp = requests.get(
    'https://httpbin.org/get',
    params={'q': 'python', 'page': 1},
    headers={'User-Agent': 'Mozilla/5.0'},
    timeout=5,
)

print(resp.status_code)     # 200
print(resp.url)             # 实际请求的完整 URL（参数已编码）
print(resp.text)            # 响应文本（str）
print(resp.json())          # 若响应是 JSON，直接解析成 dict

# POST 提交表单 / JSON
requests.post('https://httpbin.org/post', data={'a': 1}, timeout=5)
requests.post('https://httpbin.org/post', json={'a': 1}, timeout=5)
```

**要点与坑：**

- **一定要写 `timeout`**：默认不超时，网络卡住会让程序永久挂起；
- 用 `resp.raise_for_status()` 让 4xx/5xx 直接抛异常，而不是拿到错误页面继续解析；
- `resp.encoding` 可能猜错导致中文乱码，明确设 `resp.encoding = 'utf-8'`，或直接用 `resp.content.decode('utf-8')`；
- `resp.text` 是解码后的 `str`，`resp.content` 是原始 `bytes`（下载文件/图片用它）；
- 需要保持登录态（复用 Cookie）用 `requests.Session()`。

```python
session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0'})
session.get('https://example.com/login', timeout=5)

resp = session.get('https://example.com/profile', timeout=5)
resp.raise_for_status()
```

> 抓到页面后用 `re` 或 `BeautifulSoup` 提取字段；但**优先用官方 API**——抓页面容易因改版失效，也要遵守目标站的 robots 协议与相关法规。

### 3. 模块与包：导入机制

- **模块（module）**：一个 `.py` 文件；
- **包（package）**：一个含 `__init__.py` 的目录，用来组织多个模块。

```python
import os                     # 导入模块
from os import path           # 只导入其中某个名字
from os import path as p      # 起别名
from urllib.parse import urlencode

# 包内模块：xyz/qikux/test.py
import xyz.qikux.test
from xyz.qikux import test as t
```

`__init__.py` 的三个作用：

1. 让 Python 把这个目录识别为**包**（Python 3 的命名空间包可省略它，但显式保留更稳妥）；
2. 写包的初始化代码，或对外暴露快捷导入（`from .core import main`）；
3. 定义 `__all__` 控制 `from package import *` 的行为。

**绝对导入 vs 相对导入**：绝对导入写完整路径（`from xyz.qikux import test`），清晰、推荐；相对导入用点号表示层级（`from . import utils`、`from ..core import base`），只在包内部可用，**不能在顶层脚本里用**。

> `__init__.py` 在**首次导入包时执行一次**，别在里面写耗时操作或有副作用的代码。

---

## 七、高频面试题

**Q1：`re.match` 和 `re.search` 的区别？**

`match` **只从字符串开头**匹配（相当于在 pattern 前加了 `\A`），`search` 会扫描整个字符串找到第一个匹配。日常提取信息用 `search` 更常见；要求整串匹配用 `fullmatch`。

**Q2：什么是贪婪匹配？怎么改成非贪婪？**

贪婪指量词尽可能多地匹配字符。在量词（`*`、`+`、`?`、`{m,n}`）后加 `?` 即可转为非贪婪。底层原因是 NFA 引擎的回溯机制：贪婪先吃满再回吐，懒惰先吃最少再补。

**Q3：`findall` 有个很常见的坑，是什么？**

当 pattern 里**有分组**时，`findall` 返回的是**分组内容**而非完整匹配：

```python
re.findall(r'(\d+)-(\d+)', 'a1-2 b3-4')    # [('1','2'), ('3','4')]
re.findall(r'\d+-\d+', 'a1-2 b3-4')        # ['1-2', '3-4']
```

要完整匹配就去掉分组，或改用非捕获分组 `(?:...)` / `finditer`。

**Q4：`re.S` 和 `re.M` 分别解决什么问题？**

`re.S`（DOTALL）让 `.` 也能匹配换行符，用于跨行提取；`re.M`（MULTILINE）让 `^` 和 `$` 匹配每一行的首尾，用于逐行处理。两者互不影响，可以用 `re.S | re.M` 同时开。

**Q5：为什么要 `re.compile` 预编译？**

同一个 pattern 被大量重复使用时，预编译能避免重复解析，显著提升性能并让代码结构更清晰。（re 模块内部有缓存，但缓存有上限，显式编译更可控，且只有 Pattern 对象支持 `pos`/`endpos`。）

**Q6：如何提取"金额数字"但不包含单位？**

用零宽断言：`re.findall(r'\d+(?=元)', '3元和15元')` → `['3', '15']`。断言不消耗字符，所以单位不会进结果。

**Q7：什么是灾难性回溯？如何避免？**

嵌套量词（如 `(a+)+b`）在匹配失败时会尝试指数级的组合，导致 CPU 打满。避免方法：**减少嵌套量词**、用更精确的字符类（把 `.*` 换成 `[^>]*`）、锚定 `^...$`、或改用非正则的字符串方法。

```python
import re, time
p = re.compile(r'^(a+)+$')
t = time.perf_counter()
p.match('a' * 24 + 'b')                  # 失败前要试 2^24 种切分
print(f'{time.perf_counter()-t:.2f}s')   # => 秒级甚至更久，每加一个 a 翻倍

# 修正：改成等价但无歧义的写法
print(bool(re.match(r'^a+$', 'a' * 24 + 'b')))   # => False   瞬间返回
```

**Q8：如何去掉字符串中的 HTML 标签？**

```python
re.sub(r'<[^>]+>', '', html)
```

注意这只能处理简单场景，解析 HTML 请用 `BeautifulSoup` / `lxml`。

**Q9：如何匹配中文？**

`[\u4e00-\u9fa5]` 匹配常用汉字。若要包含标点和全角字符，用 `[^\x00-\x7f]` 匹配所有非 ASCII 字符。

**Q10：写正则时为什么要用 `r''` 原始字符串？**

正则本身大量使用 `\`，而 Python 字符串里 `\` 也是转义符。用 `r''` 可以避免双重转义，写 `r'\d+'` 而不是 `'\\d+'`。

**Q11：捕获分组和非捕获分组的区别？什么时候用 `(?:...)`？**

`(...)` 会保存匹配内容、占用编号，可被 `\1`/`group(1)` 引用；`(?:...)` 只用于限定 `|` 的范围或给量词分组，不保存内容。**只为分组不为取值时一律用 `(?:...)`**，可以避免污染 `findall` 的返回结构，也省一点内存。

**Q12：`\b` 是什么？举个必须用它的例子。**

零宽的单词边界（`\w` 与非 `\w` 的交界，含串首串尾）。做整词替换必须用它，否则 `re.sub('is','was','this')` 会得到 `'thwas'`。

**Q13：`re.sub` 的 `repl` 传函数有什么用？**

需要**基于匹配内容计算替换值**时（数字翻倍、脱敏、查表、条件替换），字符串模板做不到，就传一个接收 `Match` 返回 `str` 的函数。

**Q14：`re.split` 和 `str.split` 怎么选？**

分隔符固定单一用 `str.split`（快数倍）；分隔符是多种字符/变长（如 `[,;\s]+`）或需要保留分隔符时用 `re.split`。

**Q15：正则的性能优化有哪些手段？**

- 预编译成模块级常量
- 用具体字符类替代 `.`，用 `[^x]*` 替代 `.*?`
- 加锚点 `^`/`\A`，尽早失败
- 消除嵌套量词与重叠的可选项，避免二义性
- 多个关键词合成一条 `|` 正则，只扫一遍文本
- 能用 `in`/`startswith`/`split` 解决的就别用正则

**Q16：Python 后顾断言为什么会报 fixed-width 错误？**

`re` 模块实现要求后顾长度固定，才能确定往左回看几个字符。`(?<=\d+)` 长度不定，因此非法。解决办法：改用前瞻重构表达式，或先捕获再取 `group`。

**Q17：命名分组 `(?P<name>...)` 比编号分组好在哪？**

编号分组靠 `\1`、`group(1)` 引用，正则一改顺序就全乱；命名分组用 `(?P<year>\d{4})` 定义，可用 `group('year')` 或 `(?P=year)` 后向引用，**语义自解释、改结构不易错**。

```python
import re

m = re.match(r'(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})', '2026-09-21')
print(m.group('y'), m.groupdict())    # 2026 {'y': '2026', 'm': '09', 'd': '21'}
```

**Q18：`re.escape` 有什么用？**

把字符串里的**正则元字符全部转义**，让它变回「普通文本」。用于「用户输入要当作字面量去匹配」的场景，否则用户输入 `.`、`*`、`(` 会导致语法错误或误匹配。

```python
import re

kw = 'a.b*c'
print(re.escape(kw))                       # a\.b\*c
re.search(re.escape(kw), 'x a.b*c y')      # 能正确按字面量匹配
```

**Q19：`findall` 和 `finditer` 怎么选？**

`findall` 返回**列表**（一次性构造全部结果）；`finditer` 返回**迭代器**，逐个产出 `Match` 对象。文本很大、或需要每个匹配的**位置信息**（`start()`/`end()`/`group()`）时用 `finditer`，更省内存也更灵活。

```python
for m in re.finditer(r'\d+', 'a1b22c333'):
    print(m.group(), m.start(), m.end())
```

**Q20：写一个密码强度校验正则（至少 8 位，且同时含字母和数字）。**

```python
import re

def strong_pwd(pwd):
    return bool(re.fullmatch(r'(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}', pwd))

print(strong_pwd('abc12345'))   # True
print(strong_pwd('abcdefgh'))   # False
print(strong_pwd('12345678'))   # False
```

思路：用**前瞻断言**做「必须包含某类字符」的检查，`(?=.*[A-Za-z])` 表示「后面某处要有字母」、`(?=.*\d)` 表示要有数字，最后用 `[A-Za-z\d]{8,}` 约束长度与允许的字符集。用 `fullmatch` 保证整串匹配。

**Q21：为什么不该用正则解析 HTML？**

HTML **不是正则语言**：标签可嵌套、属性可换行、注释与 `<script>` 里可能有伪标签，正则无法正确处理嵌套结构。典型翻车是 `<div>.*</div>` 在多个 div 时会贪婪吞掉整段。正确做法是用 **HTML 解析器**（`BeautifulSoup`、`lxml`、`html.parser`）。只有「已知格式非常固定的片段」（如某个固定模板里的单个链接）才适合用正则应个急。

**Q22：`^`/`$` 和 `\A`/`\Z` 有什么区别？**

- `^` / `$`：默认匹配**字符串的开头/结尾**，但加了 `re.M` 后变成匹配**每一行的开头/结尾**；
- `\A` / `\Z`：**永远只匹配整个字符串的首尾**，不受 `re.M` 影响。

```python
text = 'ab\ncd'
re.findall(r'^.', text)         # ['a']       默认
re.findall(r'^.', text, re.M)   # ['a', 'c']  逐行
re.findall(r'\A.', text, re.M)  # ['a']       始终只匹配开头
```

需要「整串就是它」而非「某一行是它」时，用 `\A...\Z`（或直接 `fullmatch`）更安全。

---

## 八、易错点

1. **忘记用原始字符串**：`'\d+'` 在 Python 里 `\d` 不是合法转义（会报警告），必须写 `r'\d+'`
2. **`.` 不匹配换行**：跨行匹配一定要加 `re.S`
3. **分组改变了 `findall` 的返回结构**：不需要引用就写 `(?:...)`
4. **量词嵌套导致回溯爆炸**：优先用精确字符类而不是 `.*`
5. **校验用 `match` 而非 `fullmatch`**：会在长串中间"抠出"一段合法内容而误判通过
6. **正则不是万能的**：嵌套结构（HTML、代码）请用专门的解析器，正则只适合"扁平文本模式"
7. **`{m, n}` 里多打了空格**：整个量词失效，退化成普通字符匹配
8. **`$` 会匹配末尾换行前的位置**：严格校验结尾用 `\Z`
9. **后顾必须定宽**：`(?<=a+)` 直接抛 `re.error`
10. **否定前瞻缺少边界**：`\d+(?!元)` 会靠"少匹配一位"绕过条件，要配 `\b`
11. **用户输入直接拼进 pattern**：必须 `re.escape`，否则语义错乱甚至 `re.error`
12. **`re.sub` 替换串里的反斜杠**：`\1`、`\g<1>`、`\\` 都有特殊含义，动态内容建议传函数
13. **可选分组没匹配上返回 `None`**：拼接前记得 `or ''`
14. **误以为 `\d` 只匹配 0-9**：Python 3 默认 Unicode 语义，全角数字也会中，需要时加 `re.A`
15. **命名分组名字重复**：同一个 pattern 里 `(?P<name>...)` 不能重名，否则 `re.error`
16. **大文本用 `findall`**：会一次性构造整个列表，改用 `finditer` 惰性消费更省内存
17. **`^`/`$` 当成整串边界**：加了 `re.M` 后它们变成行边界，整串定位要用 `\A`/`\Z`
