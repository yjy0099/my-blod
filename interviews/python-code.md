---
category: Python
topic: 手写代码
difficulty: 中
tags: [面试题, 代码题, 手写代码]
---

### [代码] 写一个装饰器，统计函数的执行时间

思路：用 `functools.wraps` 保留原函数元信息，在 wrapper 里用 `time.perf_counter()` 取前后时间差。

```python
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f'{func.__name__} 耗时 {time.perf_counter() - start:.4f}s')
        return result
    return wrapper

@timer
def work(n):
    return sum(range(n))

work(1_000_000)
```

要点：必须加 `@wraps`，否则函数名会变成 `wrapper`；用 `perf_counter` 而不是 `time.time()`（后者精度低且受系统时钟调整影响）。

### [代码] 找出列表中出现次数最多的元素

思路：用 `collections.Counter` 的 `most_common`，一行搞定。

```python
from collections import Counter

def most_common(lst):
    if not lst:
        return None
    return Counter(lst).most_common(1)[0][0]

print(most_common(['a', 'b', 'a', 'c', 'a']))   # a
```

若要取 Top N：`Counter(lst).most_common(n)`。注意 `Counter` 要求元素**可哈希**。

### [代码] 给列表去重并保持原顺序

思路：利用 `dict` 键有序且唯一的特性（Python 3.7+）。

```python
def dedup(lst):
    return list(dict.fromkeys(lst))

print(dedup([3, 1, 3, 2, 1]))   # [3, 1, 2]
```

对比：`set(lst)` 会去重但**打乱顺序**，`sorted(set(lst))` 会重新排序，都不保序。

### [代码] 手写二分查找

思路：在有序数组上用左右指针收缩区间，注意用 `mid = left + (right - left) // 2` 避免溢出。

```python
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

print(binary_search([1, 3, 5, 7, 9], 7))   # 3
```

复杂度：时间 **O(log n)**，空间 O(1)。前提是数组**必须有序**。

### [代码] 判断一个字符串是否为回文

思路：双指针从两端向中间比较，跳过非字母数字字符并忽略大小写。

```python
def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome('A man, a plan, a canal: Panama'))   # True
```

取巧写法：`s == s[::-1]`，但无法忽略标点和大小写，面试时看题目要求。

### [代码] 合并两个有序列表，结果仍然有序

思路：双指针依次比较，谁小取谁；最后把剩余部分整体拼接。

```python
def merge_sorted(a, b):
    result, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i]); i += 1
        else:
            result.append(b[j]); j += 1
    result.extend(a[i:])
    result.extend(b[j:])
    return result

print(merge_sorted([1, 4, 7], [2, 3, 9]))   # [1, 2, 3, 4, 7, 9]
```

这就是**归并排序**的合并步骤，时间复杂度 O(m + n)。

### [代码] 统计一段文本中单词出现的次数，并输出 Top 3

思路：统一小写、按空白切分，用 `Counter` 统计后取前几名。

```python
import re
from collections import Counter

def top_words(text, n=3):
    words = re.findall(r"[a-zA-Z']+", text.lower())
    return Counter(words).most_common(n)

text = 'the quick brown fox jumps over the lazy dog the fox'
print(top_words(text))
# [('the', 3), ('fox', 2), ('quick', 1)]
```

要点：用正则提取单词比 `split()` 更健壮（能处理标点）；`most_common` 内部按计数降序。

### [代码] 实现一个简单的 LRU 缓存

思路：用 `OrderedDict`，命中就 `move_to_end`，超容量就弹出最旧的（`popitem(last=False)`）。

```python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key, value):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
```

要点：`get` 和 `put` 都要更新「最近使用」顺序；**O(1)** 复杂度。生产代码可直接用 `functools.lru_cache`。

### [代码] 实现列表扁平化（递归）

题目：把嵌套列表 `[1, [2, [3, [4, 5]], 6], 7]` 拍平成一维列表，要求用**递归**实现。

思路：递归 + `isinstance` 判断；也可用生成器实现惰性版本。

```python
def flatten(lst):
    result = []
    for item in lst:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result

print(flatten([1, [2, [3, [4, 5]], 6], 7]))
# [1, 2, 3, 4, 5, 6, 7]
```

要点：`isinstance(item, list)` 只认 list；若要兼容 tuple/set，改用 `isinstance(item, (list, tuple, set))`。

### [代码] 手写快速排序

思路：选基准值，把数组分成「小于基准」「等于基准」「大于基准」三份，递归拼接。

```python
def quick_sort(nums):
    if len(nums) <= 1:
        return nums
    pivot = nums[len(nums) // 2]
    left = [x for x in nums if x < pivot]
    mid = [x for x in nums if x == pivot]
    right = [x for x in nums if x > pivot]
    return quick_sort(left) + mid + quick_sort(right)

print(quick_sort([3, 6, 1, 8, 2, 9, 4]))   # [1, 2, 3, 4, 6, 8, 9]
```

复杂度：平均 **O(n log n)**，最坏 O(n²)（已有序且基准选得差）。这种写法可读性好但额外占空间，原地分区版本空间 O(log n)。

### [代码] 实现单例模式

思路：用 `__new__` 拦截实例创建；也可用装饰器或元类。

```python
class Singleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

a = Singleton()
b = Singleton()
print(a is b)   # True
```

要点：`__new__` 负责创建实例、`__init__` 负责初始化；上面的写法会导致 `__init__` 被多次调用，严谨实现需加一个初始化标志位。

### [代码] 找出列表中两数之和等于目标值的下标

思路：用哈希表把「找另一个数」从 O(n) 降到 O(1)，一次遍历即可。

```python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        need = target - num
        if need in seen:
            return [seen[need], i]
        seen[num] = i
    return []

print(two_sum([2, 7, 11, 15], 9))   # [0, 1]
```

复杂度：时间 **O(n)**、空间 O(n)。暴力双重循环是 O(n²)，面试要能说出哈希优化。

### [代码] 实现斐波那契数列（要求高效）

思路：递归 + 缓存，或直接用迭代（空间 O(1)）。

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

def fib_iter(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print(fib(50), fib_iter(50))
```

要点：朴素递归是 **O(2ⁿ)** 会超时；加缓存后降为 O(n)。迭代法最优，空间 O(1)。

### [代码] 判断两个字符串是否为变位词（anagram）

思路一：排序后比较。思路二（更优）：统计字符频次。

```python
from collections import Counter

def is_anagram(a, b):
    return Counter(a.lower()) == Counter(b.lower())

print(is_anagram('Listen', 'Silent'))   # True
```

复杂度：`Counter` 法 **O(n)**；排序法 O(n log n)。注意先统一大小写、必要时先过滤空格。

### [代码] 写一个生成器，分批读取大文件

思路：用 `yield` 逐块产出，避免一次性把整个文件读进内存。

```python
def read_in_chunks(path, size=4096):
    with open(path, 'r', encoding='utf-8') as f:
        while True:
            chunk = f.read(size)
            if not chunk:
                break
            yield chunk

for piece in read_in_chunks('big.txt'):
    process(piece)   # 一次只处理一小块
```

要点：生成器**惰性求值**，内存占用 O(size) 而非 O(文件大小)；按行读也可用 `for line in f`，同样不会整体载入。
