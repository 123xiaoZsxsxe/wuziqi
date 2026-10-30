# 五子棋

网页版五子棋，原生 HTML + Canvas + JavaScript 写的，没有依赖。双击 `index.html` 就能玩。

在线地址：https://123xiaozsxsxe.github.io/wuziqi/

## 功能

- 15 × 15 棋盘，双人对战 / 人机对战
- 悬停预览落子，最后一手有标记
- 五子连成一线时自动判胜并画线
- 悔棋、重新开始（人机模式下悔棋会一次退两步）
- 人机模式你执黑，AI 会算活四、冲四、活三这些棋型，会堵也会攻

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
game.js      棋盘绘制、落子规则、人机 AI
```

## License

MIT
