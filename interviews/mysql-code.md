---
category: MySQL
topic: SQL 实战
difficulty: 中
tags: [面试题, 代码题, SQL, 查询实战]
---

### [代码] 查询每个部门薪资最高的员工

思路一：窗口函数对部门分组排名，取第 1 名。

```sql
select * from (
    select e.*, rank() over(partition by dept_id order by salary desc) as rk
    from tb_employee e
) t where t.rk = 1;
```

思路二：用 `(dept_id, max(salary))` 组合条件匹配。

```sql
select * from tb_employee
where (dept_id, salary) in (
    select dept_id, max(salary) from tb_employee group by dept_id
);
```

要点：同一部门可能有多人并列最高，需要保留并列就用 `rank()`。

### [代码] 查询每个部门薪资前 3 名的员工

思路：窗口函数不能直接写在 `where` 里，必须套一层子查询再过滤排名。

```sql
select * from (
    select e.*, rank() over(partition by dept_id order by salary desc) as rk
    from tb_employee e
) t
where t.rk <= 3
order by dept_id, rk;
```

要点：`rank()` 并列跳号、`dense_rank()` 并列不跳号、`row_number()` 强制唯一序号，按业务语义选。

### [代码] 查询第 3 高的薪水

思路：先去重再排序，用 `limit 1 offset 2`。

```sql
select distinct salary
from tb_employee
order by salary desc
limit 1 offset 2;
```

要点：必须 `distinct`，否则并列薪水会占掉名次；`offset = N - 1`。

### [代码] 查找表中重复的邮箱

思路：按邮箱分组，`having count(1) > 1` 即重复。

```sql
select email, count(1) as cnt
from tb_user
group by email
having count(1) > 1;
```

要点：要连同重复次数一起看就加 `count`；`where` 里不能用聚合，所以条件必须写在 `having`。

### [代码] 删除重复记录，只保留 id 最小的一条

思路：自连接，把「同一邮箱且 id 更大」的行删掉。

```sql
delete t1
from tb_user t1
inner join tb_user t2
    on t1.email = t2.email
   and t1.id > t2.id;
```

要点：执行前先用 `select` 确认要删的行；生产环境建议先备份。保留最大 id 就把条件反过来写 `t1.id < t2.id`。

### [代码] 行转列：把学生成绩按科目展开成宽表

原始长表是「姓名 / 科目 / 成绩」，要转成「姓名 / 语文 / 数学 / 英语」。

```sql
select name,
       max(case subject when '语文' then score end) as 语文,
       max(case subject when '数学' then score end) as 数学,
       max(case subject when '英语' then score end) as 英语
from tb_score
group by name;
```

要点：套路是 **`group by` 分组行 + `case` 造列 + `max` 聚合成一个值**；用 `if(subject='语文', score, null)` 效果相同。列是写死的，新增科目要改 SQL。

### [代码] 列转行：把宽表还原成长表

思路：用 `union all` 把每个科目列纵向拼起来。

```sql
select name, '语文' as subject, 语文 as score from tb_score_wide
union all
select name, '数学', 数学 from tb_score_wide
union all
select name, '英语', 英语 from tb_score_wide
order by name, subject;
```

要点：每段的字段个数、类型、顺序必须一致；用 `union all` 而不是 `union`（不需要去重，性能更好）；别名只在第一段写。

### [代码] 查询没有下过订单的用户

思路一：`left join` + 右表判空。

```sql
select u.*
from tb_user u
left join tb_order o on o.user_id = u.id
where o.id is null;
```

思路二：`not exists`（语义更清晰，子查询通常更快）。

```sql
select u.*
from tb_user u
where not exists (select 1 from tb_order o where o.user_id = u.id);
```

要点：不要用 `not in`——如果子查询结果含 null，`not in` 会返回空集。

### [代码] 查询成绩高于平均分的学生

思路：把 `avg` 作为标量子查询放进 `where`。

```sql
select s.*
from tb_student s
where s.score > (select avg(score) from tb_student);
```

要点：标量子查询返回单值，可以直接用比较运算符；不能写成 `where score > avg(score)`（`where` 里不能用聚合函数）。

### [代码] 统计每个月的订单数和总金额

思路：用 `date_format` 取年月分组。

```sql
select date_format(create_time, '%Y-%m') as ym,
       count(1) as order_cnt,
       sum(amount) as total_amount
from tb_order
group by date_format(create_time, '%Y-%m')
order by ym;
```

要点：`group by` 里也要写同样的表达式（或用别名，MySQL 支持但标准 SQL 不支持）；空月份不会出现，需要补零得借助日历表。

### [代码] 查询每个用户的第一笔订单

思路：窗口函数按用户分组、按下单时间升序取第一行。

```sql
select * from (
    select o.*,
           row_number() over(partition by user_id order by create_time asc) as rn
    from tb_order o
) t where t.rn = 1;
```

要点：用 `row_number()` 保证每人只取一条；若用 `rank()` 且时间并列，会一次取出多条。

### [代码] 分页查询第 3 页，每页 10 条

```sql
select * from tb_order
order by create_time desc
limit 10 offset 20;
```

要点：公式 `offset = (page - 1) * rows = (3 - 1) * 10 = 20`；深分页（如 `offset 1000000`）会先扫描并丢弃前面的行，应改用游标法 `where id < 上一页最小 id limit 10` 或延迟关联。

### [代码] 查询连续 3 天登录的用户

思路：经典的「间隙与岛屿」——用 `登录日期 - row_number()` 得到一个分组标识，同日期的差值相同即代表连续。

```sql
select user_id, min(login_date) as start_date, max(login_date) as end_date
from (
    select user_id, login_date,
           date_sub(login_date,
                    interval row_number() over(partition by user_id order by login_date) day
           ) as grp
    from (
        select distinct user_id, date(login_time) as login_date from tb_login_log
    ) d
) t
group by user_id, grp
having count(1) >= 3;
```

要点：先 `distinct` 把「一天多次登录」压成一天；连续日期的 `日期 - 序号` 是常数，这是判断连续区间的通用套路。

### [代码] 计算每日的次日留存率

思路：把登录表自连接，右表取「次日也登录」的记录，按日期分组算比例。

```sql
select a.login_date as dt,
       count(distinct b.user_id) / count(distinct a.user_id) as retention
from (select distinct user_id, date(login_time) as login_date from tb_login_log) a
left join (select distinct user_id, date(login_time) as login_date from tb_login_log) b
       on b.user_id = a.user_id
      and b.login_date = date_add(a.login_date, interval 1 day)
group by a.login_date
order by dt;
```

要点：用 `left join` 保证「当天登录但次日没回」的用户仍在分母里；分母分子都加 `distinct` 防止重复登录导致比例失真。

### [代码] 查询各分类的销量及占比

思路：先用窗口函数求出总销量，再逐行做除法。

```sql
select category,
       sum(qty) as qty,
       round(sum(qty) / sum(sum(qty)) over() * 100, 2) as pct
from tb_order_item
group by category
order by qty desc;
```

要点：`sum(sum(qty)) over()` 里层的 `sum` 是分组聚合、外层的 `over()` 把它变成窗口求和，得到全表总量；直接写 `sum(qty)` 会被 `group by` 限制而算错。
