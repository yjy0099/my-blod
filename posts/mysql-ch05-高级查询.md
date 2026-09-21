---
title: MySQL 笔记 · 第 5 章：高级查询
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, 子查询, 连接查询, 递归查询]
summary: 把查询从「单表」升级到「多表」：四类子查询（列/关系条件/in/exists）、嵌套查询与别名、with 临时表、union 与 union all、left/right/inner join 关联查询、with recursive 递归查询（查下级/查上级），附 12 道高频面试题。
---

## 一、必须记住的知识点

### 1. 子查询 subquery

**（1）基于列的子查询**：只能返回**单列单值**（标量），可写在 select 列表中。

```sql
-- 查询所有收货地址和对应的用户名
select d.*,
    (select u.username from tb_user u where u.id = d.user_id) as username
from tb_address as d;

-- 查询所有用户信息和对应的收货地址数量
select u.*,
    (select count(1) from tb_address d where d.user_id = u.id) as addr_count
from tb_user u;
```

**（2）基于关系条件的子查询**：子查询返回**单列单值**。

```sql
-- 查询用户名为 admin 的收货地址
select d.* from tb_address d
    where user_id = (select id from tb_user where username = 'admin');

-- 查询成绩最高的学生
select s.* from student s where s.score = (select max(score) from student);

-- 查询成绩超过平均分的学生
select s.* from student s where s.score > (select avg(score) from student);
```

**（3）基于 in 条件的子查询**：子查询返回**单列多值**。

```sql
-- 查询出生日期相同的学生
select s.* from student s where s.birthday in
    (select birthday from student group by birthday having count(1) > 1);

-- 查询角色为「开发人员」「销售人员」的用户（多层嵌套）
select u.* from tb_user u
    where u.id in (
        select ru.user_id from tb_role_user ru
        where ru.role_id in (
            select r.id from tb_role r where r.name in ('开发人员', '销售人员')
        )
    );
```

**（4）基于 exists 条件的子查询**：不关心返回什么，只关心**是否存在**（相关子查询）。

```sql
-- 查询出生日期和性别都相同的学生
select s.* from student s where exists (
    select 1 from student t
    where t.birthday = s.birthday and t.gender = s.gender
    group by birthday, gender having count(1) > 1
);
```

> `in` 与 `exists` 的选择：**外层小、内层大 → `in`**（先执行内层）；**外层大、内层小 → `exists`**（对外层每行去内层探测，能提前短路）。

### 2. 嵌套查询

把一个查询的结果**当作一张表**继续查询，必须设置**别名**（MySQL 要求派生表必须有别名）。

```sql
-- 查询最大成绩和最小成绩对应的学生
select * from student t where exists (
    select 1 from (
        select max(x.score) as max_score, min(x.score) as min_score from student x
    ) a where t.score in (a.max_score, a.min_score)
);
```

### 3. with 查询（MySQL 8.0+）

`with` 是嵌套查询的优化，把「基于表的子查询」**提前声明成临时表**，可读性更好。多个临时表用逗号分隔，`with` 只出现一次。

```sql
with temp as (
    select max(score) as max_score, min(score) as min_score from student
)
select * from student t
    where exists (select 1 from temp a where t.score in (a.max_score, a.min_score));
```

### 4. 集合查询 union / union all

把两个查询结果**纵向合并**为一个结果集。

```sql
select max(score) as score from student
union all
select min(score) from student;
```

**要求与规则：**

- 两个 SQL 的**字段个数、类型、顺序必须一致**；
- 最终字段名以**第一个 SQL** 为准（所以只给第一句起别名）；
- `union` 会**去重**（有排序开销），`union all` **不去重**（更快）。

### 5. 关联查询（连接查询）

对具有关联关系的表/数据进行查询。

- **内连接 `inner join`**：只返回两边都匹配的行；
- **左外连接 `left join`**：返回左表**全部** + 右表匹配的行，右表没有的补 null；
- **右外连接 `right join`**：返回右表**全部** + 左表匹配的行；
- `inner` 和 `outer` 关键字可以省略。

```sql
-- 查询所有用户信息和对应的真实姓名、手机号（用户可能有也可能没有 info）
select u.*, f.name, f.tel
from tb_user u
    left join tb_user_info f on u.id = f.user_id;
```

> **`on` 和 `where` 在外连接中的区别**：`on` 决定「怎么匹配」，写在 `on` 里对右表的过滤**不会**影响左表保留；写在 `where` 里则会把补 null 的行过滤掉，**外连接退化成内连接**——这是高频陷阱。

### 6. 递归查询 with recursive

**场景：查某人的所有下级（向下递归）**

```sql
-- 查询张三丰的徒子徒孙
with recursive temp as (
    select * from tb_employee where name = '张三丰'
    union
    -- 用临时表 temp 自己 join 自己，逐层向下找徒弟
    select e.* from tb_employee e
        inner join temp t on e.pid = t.id
)
select * from temp;
```

**场景：查某人的所有上级（向上递归）**

```sql
-- 查询张无忌和它的所有上级
with recursive temp as (
    select * from tb_employee where name = '张无忌'
    union
    select e.* from tb_employee e
        inner join temp p on p.pid = e.id
) select * from temp;
```

> 递归查询的结构固定为：**锚点查询（起点）`union` 递归查询（用临时表 join 自己）**。向下递归用 `e.pid = t.id`，向上递归用 `p.pid = e.id`，方向别写反。

## 二、常用命令速查

```sql
-- 标量子查询
select (select count(1) from b where b.aid = a.id) from a;

-- in 子查询
select * from t where col in (select col2 from t2);

-- 派生表 / with
with x as (select ...) select * from x;

-- 连接查询
select * from a left join b on a.id = b.aid;
```

## 三、高频面试题（附答案）

**Q1：`in` 和 `exists` 的区别？怎么选？**

`in` 先执行子查询、把结果集缓存后与外层比较，适合**子查询结果小**的场景；`exists` 是相关子查询，对外层每行去子查询里探测是否命中，**命中即短路**，适合**子查询结果大、外层结果小**的场景。注意 `in` 遇到子查询结果含 null 时有坑：`not in (包含 null)` 会返回空集。

**Q2：`union` 和 `union all` 的区别？**

`union` 会**去重并排序**，有额外开销；`union all` 直接拼接**不去重**，性能更好。**明确不需要去重时一律用 `union all`**。

**Q3：`left join`、`right join`、`inner join` 的区别？**

`inner join` 只保留两边都匹配的行；`left join` 保留左表全部行，右表无匹配补 null；`right join` 反之。`left join` 与 `right join` 在写法上可互相转换（交换表顺序）。

**Q4：`on` 和 `where` 在连接查询中的区别？**

`on` 是**连接条件**，决定两表如何匹配；`where` 是**结果过滤**。在**外连接**中，把右表的过滤条件写在 `on` 里，左表不匹配的行仍保留（右表列补 null）；写在 `where` 里则会把这些行滤掉，外连接**退化为内连接**。

**Q5：三表甚至多表怎么连接？**

链式写下去即可：`from a join b on ... join c on ...`，每加一张表就加一个 `join ... on ...`。注意连接顺序和索引会影响性能，`on` 的关联字段应该有索引。

**Q6：什么是相关子查询？**

子查询里引用了外层查询的列（如 `where t.birthday = s.birthday` 中的 `s`），因此子查询**不能独立执行**，必须对外层每一行都执行一次，效率通常较低，但配合索引和 `exists` 短路可以很高效。

**Q7：`with`（CTE）有什么好处？**

① 把复杂的嵌套子查询拆成可读的「临时表」，提升可维护性；② 同一个 CTE 可被多次引用，避免重复写；③ 支持 `with recursive` 实现递归查询。缺点是 MySQL 8.0 才支持。

**Q8：递归查询能解决什么问题？举例。**

树状/层级数据：组织架构（查某人的所有下属）、商品分类（查某分类的所有子分类）、评论盖楼、菜单树。核心是「锚点 + 自连接递归」。

**Q9：`left join` 后右表条数多于左表会怎样？**

结果行数会**膨胀**（左表一行匹配右表多行 → 生成多行），这是「join 后 count 变大」的常见原因。需要去重时用 `distinct` 或先用子查询聚合右表再 join。

**Q10：为什么有时 `left join` 的结果和 `inner join` 一样？**

因为 `where` 里加了右表字段的非空条件（如 `where b.status = 1`），把右表补 null 的行过滤掉了，外连接退化成了内连接。应把该条件移到 `on` 里。

**Q11：子查询和连接查询哪个性能好？**

不能一概而论。现代优化器常把子查询改写成连接；但**可改写成连接的关联子查询通常连接更快**（避免逐行执行）。经验：能 join 就 join，`in`/`exists` 注意数据量方向，`select` 列表里的标量子查询要控制外层行数。

**Q12：`not in` 有什么坑？**

如果子查询结果里**含 null**，`not in` 会返回**空结果集**（因为 `x <> null` 永远是未知）。安全写法是用 `not exists`，或确保子查询结果非空。

## 四、易错点

1. **派生表忘记写别名**：MySQL 要求每个派生表必须有别名，否则报错。
2. **`not in` 遇上 null**：结果直接变空，改用 `not exists`。
3. **外连接里把右表条件写进 `where`**：外连接退化为内连接，条件应写 `on`。
4. **`union` 字段数/类型不一致**：直接报错，务必对齐列。
5. **`union` 想省性能却用了去重版**：不需要去重时用 `union all`。
6. **递归查询方向写反**：向下递归 `e.pid = t.id`，向上递归 `p.pid = e.id`。
7. **递归没有终止条件导致死循环**：数据中若存在环形引用（A 的父是 B、B 的父是 A）会无限递归，需靠 `cte_max_recursion_depth` 兜底。
8. **`join` 忘写 `on`**：变成**笛卡尔积**，行数爆炸。
9. **多表 join 后列名冲突**：同名列要加表别名前缀。
10. **`exists` 里写 `select *`**：语义上无所谓（只看是否有行），但习惯写 `select 1` 更清晰。
