## 五子棋

网页版五子棋，原生 HTML + Canvas + JavaScript，没有依赖。双击 `index.html` 就能玩。

在线地址：https://123xiaozsxsxe.github.io/wuziqi/

## 玩法

- 15 × 15 自由五子棋，黑棋先行，任意一方连成五子或更多即获胜
- 「双人」模式下两人轮流落子；「人机」模式下你执黑，电脑执白
- 人机有简单、普通、困难三档：简单会随手乱下，普通按棋型评分挑点，困难还会多算一步对手的反击
- 每局有计时，第一手落下开始走，分出胜负后停表
- 悔棋：双人模式退一手，人机模式退两手，直接轮到你下
- 重新开始会清空棋盘，计时归零
- 支持键盘操作：先按 `Tab` 聚焦棋盘，再用方向键移动选点，按 `Enter` 或空格落子，按 `Esc` 离开棋盘

## 运行

直接打开 `index.html`。想用本地服务器的话：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 文件

```
index.html   页面结构
style.css    样式
game.js      棋盘绘制、规则判定、人机 AI
```

## License

本项目采用 [MIT License](LICENSE)。
