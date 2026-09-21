---
title: MySQL 笔记 · 第 9 章：用户权限与运维
date: 2026-09-21
category: MySQL 数据库
tags: [MySQL, 数据库, 学习笔记, 面试题, DCL, 权限, 备份恢复, 运维]
summary: 收官一章讲「数据库怎么管」：mysql.user 表结构与 host 通配、创建用户/改密码/禁用启用、DCL 的 grant 与 revoke 授权模型、mysqldump 备份与恢复、以及忘记 root 密码时的 skip-grant-tables 抢救流程，附 12 道高频面试题。
---

## 一、必须记住的知识点

### 1. mysql.user 用户表

MySQL 内置 `mysql.user` 表，存储当前数据库的所有账号信息。

| 字段 | 含义 |
| --- | --- |
| `user` | 用户名 |
| `host` | 允许访问的主机，默认 `localhost`；改成 `%` 表示允许**任意主机远程连接** |
| `plugin` | 密码插件：MySQL 8 以下是 `mysql_native_password`，8.x 是 `caching_sha2_password` |
| `authentication_string` | 加密后的密码 |
| `account_locked` | 账号是否被锁定 |

> **`user@host` 是一个整体**：`'root'@'localhost'` 和 `'root'@'%'` 是**两个不同的账号**，权限互不相通。这是初学者最容易踩的坑。

### 2. 用户管理

```sql
-- 创建用户
create user <用户名>@<host> identified by '密码';

-- 修改密码
alter user <用户名>@<host> identified by '新密码';

-- 禁用 / 启用账号
alter user <用户名>@<host> account lock;
alter user <用户名>@<host> account unlock;

-- 删除用户
drop user <用户名>@<host>;

-- 查看用户
select user, host from mysql.user;
```

### 3. DCL：授权与撤销

```sql
-- 授权
grant 权限列表 on <databaseName>.<tableName> to <用户名>@<host>;

-- 撤销权限
revoke 权限列表 on <databaseName>.<tableName> from <用户名>@<host>;

-- 授权后刷新权限（改权限表后需要，grant/revoke 通常会自动刷新）
flush privileges;
```

**通配符规则：**

- 权限列表：`select`、`insert`、`create`、`drop` ...，用 `all` 表示所有权限；
- `databaseName`：支持 `*`，代表所有数据库；
- `tableName`：支持 `*`，代表某库下的所有表。

```sql
-- 只给某用户指定库的查询权限（最小权限原则）
grant select on shop_db.orders to 'reader'@'%';

-- 授予所有库所有表的全部权限（慎用）
grant all on *.* to 'py2502'@'%';

-- 收回删除权限
revoke delete on shop_db.* from 'reader'@'%';
```

> **最小权限原则**：应用账号只给必需的权限，绝不给 `all on *.*`；`root` 只用于管理，不用于业务连接。

### 4. 备份与恢复（mysqldump）

```bash
# 备份：把指定数据库导出为 SQL 文件
mysqldump -u<用户名> -p<密码> -P<端口> -h<IP> <databaseName> > back.sql

# 恢复：把 SQL 文件导回数据库
mysql -u<用户名> -p<密码> -P<端口> -h<IP> --default-character-set=utf8mb4 <databaseName> < back.sql
```

- 端口默认 3306 可省略 `-P`，导入本机可省略 `-h`；
- `mysqldump` 导出的是**逻辑备份**（SQL 语句），适合中小库；
- 大库/要求高可用时用**物理备份**（如 XtraBackup）或主从复制。

**常用扩展参数：**

```bash
# 导出所有数据库
mysqldump -uroot -p --all-databases > all.sql

# 只导出表结构（不要数据）
mysqldump -uroot -p --no-data shop_db > schema.sql

# 单表备份
mysqldump -uroot -p shop_db orders > orders.sql
```

### 5. 找回 root 密码

思路：**跳过权限校验启动 → 无密码登录 → 清空/重设密码 → 正常重启**。

```bash
# 1. 停止 MySQL 服务
net stop mysql

# 2. 跳过权限验证启动（前台运行，保持窗口不关）
mysqld --skip-grant-tables --console --shared-memory
```

```sql
-- 3. 另开一个命令行，无密码登录
-- mysql -uroot -p   （直接回车）

-- 4. 把 root 密码置空
update mysql.user set authentication_string = '' where user = 'root';
flush privileges;
```

```bash
# 5. 关闭所有命令行窗口，正常启动服务
net start mysql
```

```sql
-- 6. 用空密码登录后设置新密码
mysql -uroot -p
alter user 'root'@'localhost' identified by '新密码';
```

> MySQL 8 中 `authentication_string` 不能直接 `update` 成明文，推荐流程是在 `skip-grant-tables` 下先 `flush privileges`，再用 `alter user` 改密；若用 `update`，8.0 里需要配合 `plugin` 字段处理，稳妥起见优先 `alter user`。

## 二、常用命令速查

```sql
select user, host from mysql.user;              -- 查看用户
create user 'u'@'%' identified by 'pwd';        -- 建用户
alter user 'u'@'%' identified by 'newpwd';      -- 改密
alter user 'u'@'%' account lock;                -- 锁定
grant select on db.* to 'u'@'%';                -- 授权
revoke select on db.* from 'u'@'%';             -- 撤权
drop user 'u'@'%';                              -- 删用户
show grants for 'u'@'%';                        -- 查看某用户权限
```

```bash
mysqldump -uroot -p db > back.sql               # 备份
mysql -uroot -p db < back.sql                   # 恢复
```

## 三、高频面试题（附答案）

**Q1：`'root'@'localhost'` 和 `'root'@'%'` 是同一个用户吗？**

**不是**。MySQL 用 `用户名 + 主机` 共同标识一个账号，两者是独立账号，权限分别配置。只给 `root@localhost` 授权，远程仍连不上，必须单独给 `root@%` 授权。

**Q2：`host` 写成 `%` 意味着什么？安全吗？**

`%` 是通配符，表示允许**任意主机**连接。方便但**不安全**，生产环境应限制为具体 IP 段或内网地址，避免数据库直接暴露在公网。

**Q3：`grant` 和 `revoke` 分别做什么？**

`grant` 授予权限，`revoke` 收回权限，二者都属于 **DCL（数据控制语言）**。授权粒度可到「库.表」，通过 `*` 通配所有库/表。

**Q4：为什么要有「最小权限原则」？**

应用账号一旦被攻破，攻击者能造成的破坏取决于它的权限。只给必需权限（如只给某库的增删改查）能把损失降到最低；`root` 或 `all on *.*` 一旦泄露则全库沦陷。

**Q5：`flush privileges` 是做什么的？什么时候必须用？**

它让 MySQL 重新从权限表加载权限到内存。`grant`/`revoke`/`create user` 会自动刷新；但如果你**直接 `update mysql.user` 表**改权限，就必须手动 `flush privileges` 才生效。

**Q6：MySQL 8 的默认认证插件是什么？有什么影响？**

`caching_sha2_password`。比 5.7 的 `mysql_native_password` 更安全，但**一些老客户端/驱动不支持**，连接会报认证错误，需要升级驱动或把用户改成 `mysql_native_password`。

**Q7：`mysqldump` 备份的原理和局限？**

原理是导出**建表语句 + 插入语句**（逻辑备份）。优点是通用、可跨版本、可读；缺点是大库导出/恢复慢、恢复期间数据是快照点而非实时、不加 `--single-transaction` 可能锁表。生产大库建议 XtraBackup 物理备份 + 主从。

**Q8：备份时 `--single-transaction` 有什么用？**

让 InnoDB 在**一致性快照**下导出，避免锁表影响线上业务，是热备的常用参数（配合 `--master-data` 还能记录 binlog 位点，便于搭建主从）。

**Q9：忘记 root 密码怎么恢复？核心原理是什么？**

核心是 `--skip-grant-tables`：启动时**跳过权限系统的校验**，让任何账号都能无密码登录，然后修改 root 密码、恢复正常启动。关键点是改完必须重启服务让权限校验重新生效。

**Q10：`drop user` 和 `delete from mysql.user` 有什么区别？**

`drop user` 是标准语句，会**连带清理该用户的权限记录**并刷新缓存；直接 `delete from mysql.user` 只删表里的行，可能留下权限残留，还需手动 `flush privileges`。**优先用 `drop user`**。

**Q11：如何查看某个用户有哪些权限？**

`show grants for 'user'@'host';`。会列出该账号被授予的权限，方便排查「明明授权了为什么没权限」这类问题。

**Q12：为什么生产环境不允许应用直接用 root 连接？**

root 拥有全部权限，一旦应用被注入攻击或配置泄露，攻击者可删库、改权限、读所有数据。应创建**专用的最小权限账号**，并限制来源 IP。

## 四、易错点

1. **只建了 `@localhost` 却要远程连接**：远程连不上，得建 `@'%'` 或具体 IP 的账号。
2. **`%` 账号暴露公网**：等于把数据库大门敞开，务必限制来源。
3. **直接 `update mysql.user` 后不 `flush privileges`**：权限不生效，还以为改错了。
4. **MySQL 8 老驱动连不上**：认证插件 `caching_sha2_password` 不兼容，需升级驱动或换插件。
5. **`mysqldump` 大库直接导**：耗时长且可能锁表，应加 `--single-transaction`。
6. **恢复时忘了 `--default-character-set=utf8mb4`**：中文乱码，尤其在跨版本/跨平台恢复时。
7. **备份文件不含「建库语句」**：`mysqldump db > back.sql` 默认不含 `create database`，恢复到新环境前要先建库。
8. **`skip-grant-tables` 后忘了重启**：权限校验一直关闭，等于数据库无防护，改完密码必须正常重启。
9. **`drop user` 漏写 host**：写成 `drop user 'u'` 可能删错账号，务必写全 `'u'@'host'`。
10. **把备份文件放在数据库所在机器**：机器一挂备份也没了，备份应异地/异盘存放，并**定期演练恢复**（没验证过的备份等于没有备份）。
