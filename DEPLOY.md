# 上传项目到 GitHub 并部署 Pages 操作手册

适用对象：你自己，从零开始把任意静态项目（本博客也一样）传到 GitHub、并发布成公开网站。
环境：Windows + Git Bash（PortableGit）。命令复制即用。

---

## 一、一次性准备（每台电脑只需做一次）

### 1. 安装 Git
- 已装可跳过。没装去 https://git-scm.com 下载 Windows 版，默认选项一路 Next 即可。
- 验证：`git --version` 能输出版本号即可。

### 2. 配置 Git 提交身份（写进全局，所有仓库共用）
```bash
git config --global user.name  "你的GitHub用户名"
git config --global user.email "你GitHub验证过的邮箱"
```
> 邮箱务必用 GitHub 账号里「验证过」的邮箱，这样提交才会算进你的贡献图。

### 3. 生成并添加 SSH 公钥（推荐，一次配置终身免登录）
```bash
# 生成密钥（一路回车，不要设密码短语）
ssh-keygen -t ed25519 -C "你的邮箱"

# 查看公钥，把输出整行复制
cat ~/.ssh/id_ed25519.pub
```
然后把那行 `ssh-ed25519 AAAA... 邮箱` 加到 GitHub：
**GitHub 网页 → 右上角头像 → Settings → SSH and GPG keys → New SSH key**
（Title 随便填，Key type 选 Authentication Key）

验证是否生效：
```bash
ssh -T git@github.com
# 成功会显示：Hi 你的用户名! You've successfully authenticated...
```

---

## 二、本地初始化项目

### 1. 进入项目目录
```bash
cd D:/myweb
```

### 2. 写 .gitignore（非常重要，见误区 1）
新建 `.gitignore`，把不需要/不能公开的文件排除：
```
# 个人笔记 / 本地配置
.workbuddy/

# 系统垃圾
.DS_Store
Thumbs.db
*.log

# 依赖（如有）
node_modules/
__pycache__/
.venv/
```
> 本项目已经写好了 `.gitignore`，含 `.workbuddy/`，不用再改。

### 3. 初始化并提交
```bash
git init -b main
git add .
git commit -m "首次提交：项目初始化"
```

---

## 三、在 GitHub 创建仓库（关键步骤）

1. 右上角 **+ → New repository**
2. **Repository name**：起个名字（如 `my-blog`）
3. **Visibility**：选 Public（想当作品集就公开）
4. **三个勾选项全部不要勾**：
   - [ ] Add a README file
   - [ ] Add .gitignore
   - [ ] Choose a license
5. 点 **Create repository**

> 记住创建后的仓库地址，用 SSH 形式：`git@github.com:你的用户名/仓库名.git`
> **务必从网页上复制真实地址，不要凭记忆拼**——拼写错一个字母就会报 "Repository not found"（见误区 2）。

---

## 四、关联并推送

```bash
# 关联远程仓库（换成你自己的地址）
git remote add origin git@github.com:你的用户名/仓库名.git

# 推送（首次加 -u 绑定上游）
git push -u origin main
```
看到 `* [new branch] main -> main` 即成功。

---

## 五、启用 GitHub Pages

1. 打开仓库 **Settings → Pages**（或 `https://github.com/用户名/仓库名/settings/pages`）
2. **Build and deployment → Source** 选 **Deploy from a branch**
3. **Branch** 选 **main**，**目录** 选 **/ (root)**
4. 点 **Save**
5. 顶部出现绿条「Currently deploying…」，**等 1~2 分钟**再访问

站点地址格式：
```
https://用户名.github.io/仓库名/
```
（本博客即 https://yjy0099.github.io/my-blod/ ）

---

## 六、验证部署

浏览器打开上面的地址，或直接用命令测：
```bash
curl -I https://用户名.github.io/仓库名/
# 返回 HTTP/2 200 即正常
```
重点抽查：首页、一篇子页面、CSS/JS 文件、以及（如果是本博客）`posts/index.json` 是否 200。

---

## 七、日常更新流程（以后每次改完都这样）

```bash
git add -A
git commit -m "更新说明"
git push
```
push 后 GitHub Pages 会**自动重新部署**，约 1~2 分钟后刷新即可看到新内容。

---

## 八、常见误区（重点收藏）

| # | 误区 | 正确做法 / 后果 |
|---|------|----------------|
| 1 | 没写 `.gitignore` 就 `git add .` | 个人笔记、密钥、缓存全被上传，**隐私泄露**。务必先排除 `.workbuddy/`、`node_modules/` 等 |
| 2 | 仓库名凭记忆拼（如 `my-blog` 实际是 `my-blod`） | push 报 `Repository not found`。地址从网页复制，别手敲 |
| 3 | 创建仓库时勾了 README / .gitignore / license | 远端有初始提交，本地 push 被拒（non-fast-forward）。空仓库最省事 |
| 4 | SSH 公钥没加到 GitHub 就 push | 报 `Permission denied (publickey)`。先 `ssh -T git@github.com` 验证通过再推 |
| 5 | HTTPS 推送时「Password」填 GitHub 登录密码 | 现代 GitHub 已不支持密码，要填 **Personal Access Token (PAT)**。建议直接用 SSH 免密 |
| 6 | GitHub Pages 默认会 Jekyll 处理 `posts/` 目录 | 本博客靠 JS 直接拉 `.md`，被 Jekyll 动过会读不到。根目录加 `.nojekyll` 关闭它 |
| 7 | 子路径部署用了绝对路径 `/assets/...` | 部署到 `github.io/仓库名/` 子路径下，绝对路径指向错误根，导致**白屏**。全部用相对路径 |
| 8 | 部署完立刻访问以为失败 | Pages 构建要 1~2 分钟，耐心等，别反复刷新误判 |
| 9 | 私有仓库不能用 Pages | 能用，但**只有你自己**能访问。要给别人看必须 Public 仓库 |
| 10 | 改完 `.md` 文章以为要重跑索引才能上线 | 本博客 `post.js` 直接拉源文件渲染，索引只存元数据。改正文后直接 push 即可 |
| 11 | Windows 上 `git add` 出现 CRLF 警告 | 无害，Git 会自动处理换行符，忽略即可 |
| 12 | `git remote set-url` 后状态显示 `[gone]` 就以为没推成功 | 这是本地 refs 的显示副作用，实际可能已推成功。用 `git ls-remote origin` 或网页核对真实提交 |

---

## 九、本博客的特有关注点

- **所有路径必须相对**：HTML 里 `assets/css/style.css`、JS 里 `fetch('posts/index.json')`，都不能带前导 `/`。这样在 `github.io/my-blod/` 子路径下才正常。
- **`.nojekyll` 已存在**：不要删，删了 `posts/` 里的文章会被 Jekyll 错误处理。
- **加新文章**：在 `posts/` 放 `.md`（含 front-matter），跑 `python tools/build_index.py` 更新索引，然后 `git add -A && git commit && git push`。
- **本地预览**：双击 `start.bat`，访问 `http://localhost:8000`（不要用 `file://` 直接双击 HTML，浏览器会拦截本地文件读取）。

---

## 十、想升级可以加的（可选，不影响现有）

- **自定义域名**：买域名后，在 Pages 设置里填 Custom domain，可隐藏 `yjy0099` 用户名。
- **GitHub Actions 自动部署**：现在 Pages 已能自动 rebuild，不必急着加；如需更明确流程可添加工作流文件。
- **站内搜索 / RSS / 评论**：属功能增强，不影响部署。
