# 涿鹿弈境｜黃帝・蚩尤

以涿鹿神話為主題的 9:16 象棋遊戲。純靜態 HTML / CSS / ES Modules，沒有執行期套件、伺服器資料庫或外部 AI API。圖像為專案生成的奇幻插畫；音樂與音效為 Web Audio 合成的原創音色。

## 線上遊玩

[開啟涿鹿弈境](https://bd-cs1.github.io/zhuolu-xiangqi/) — 手機與電腦瀏覽器皆可直接遊玩，無需登入。

## 功能

- 紅方玩家對黑方電腦（三級棋力）或同機雙人。
- 傳統走法、合法落點、蹩馬腿／塞象眼／將帥照面、自將檢查、將死與困斃。
- 40 幅直幅高細節雙方對戰插畫，按紅黑棋子配對選圖；覆蓋 72 種合法吃子方向。
- 圖片完整載入後才開始 7 秒倒數，可暫停賞圖或立即返回棋局。
- 神話戰場圖鑑可依紅方、黑方棋子篩選及展開大圖；音樂、音效與轉場皆可控制。
- Web Worker 內的限時 alpha-beta 搜尋；提示、悔棋、戰報。
- localStorage 保存目前棋局與設定，鍵盤與觸控操作。

## 檔案

- `dist/index.html`：介面、對話框與轉場容器。
- `dist/style.css`：9:16 版型、棋盤、棋子與動態視覺。
- `dist/engine.js`：無 DOM 的規則與棋力搜尋。
- `dist/ai-worker.js`：背景棋步推演。
- `dist/app.js`：互動、保存、棋局歷史、轉場與 Web Audio。
- `dist/battle-catalog.js`：40 組紅黑棋子對戰配對、標題、地點與資產路徑。
- `dist/battle-viewer.js`：圖片載入、7 秒倒數、暫停與圖鑑共用觀賞器。
- `dist/assets/battles/*.webp`：40 幅原生直幅插畫及 40 幅縮圖，保持生成解析度（約 941 × 1672）。
- `docs/battle-art-briefs.json`：各配對美術提示詞與角色描述。
- `docs/battle-art-assets.json`：尺寸、容量與 SHA-256 資產清單。
- `scripts/import-battle-art.py`：PNG 轉高品質 WebP 與圖鑑縮圖（開發用，需要 Pillow）。
- `tests/engine.test.mjs`：走法、將軍、困斃、搜尋與自我對弈測試。
- `tests/battle-catalog.test.mjs`：72 種吃子方向的精確配對、紅黑角色互換與全部資產完整性測試。
- `.openai/hosting.json`：Sites 專案身分與靜態部署目錄。
- `.github/workflows/pages.yml`：測試通過後自動發布 `dist/` 至 GitHub Pages。

## 執行與測試

用 HTTP 靜態伺服器提供 `dist/`，不要直接以 `file://` 開啟（ES Modules 與 Worker 需要 HTTP）。規則測試執行 `npm test`，不需要安裝相依套件。Sites 靜態部署直接使用 `dist/`。

## GitHub Pages 發布與更新

公開儲存庫：<https://github.com/BD-CS1/zhuolu-xiangqi>。在 Settings → Pages 將 Source 設為 **GitHub Actions**。推送或合併變更至 `main` 後，`Test and deploy game to GitHub Pages` 工作流程先執行全部 17 項測試，再將 `dist/` 與全部插畫發布至公開網址；測試失敗不會執行部署。亦可在 Actions 手動執行工作流程。

修改遊戲時保留 `dist/` 內的相對資產路徑，以支援 `/zhuolu-xiangqi/` 專案路徑。部署結果可在儲存庫 Actions 與 Settings → Pages 查看。Sites 與 GitHub Pages 是獨立部署；在其中一方修改不會自動同步另一方。不同網域的本機棋局保存也各自獨立。

## 規則與限制

走法參考世界象棋聯合會《2018 World Xiangqi Rules》：https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf

本作是休閒規則，第三次同局面自動和棋；未實作競賽長將、長捉、自然限著等仲裁。電腦是入門至休閒級搜尋，不是專業象棋引擎。雙人為同機輪流，沒有遠端連線、帳號或雲端棋局同步。

瀏覽器資料以 `zhuolu-xiangqi-v1` 保存；清除網站資料會刪除棋局。初次互動前瀏覽器可能不播放聲音。背景音樂是原創五聲音階合成，沒有引用既有商業遊戲錄音。神話角色與戰鬥為藝術演繹。

## 神話戰場圖庫 v2

由「設定」或「戰報」中的「四十式 · 神話戰場圖鑑」開啟圖庫。插畫依同一對紅黑兵種共用（例如紅炮吃黑馬、黑馬吃紅炮是同一對角色交鋒），攻方與吃子結果由介面標示；紅馬對黑炮會選另一張專屬插畫。主帥不作為吃子受害方；仕、相、帥與對方仕、象、將的固定領域不相交，因此沒有虛構不能出現的配對。

大圖採原生直幅完整顯示，不以橫圖放大裁切充數。首次僅預載兩組常見炮馬交戰，其他按選子與觀賞需求載入，圖鑑使用獨立小圖，避免開局下載整個圖庫。圖鑑開啟期間暫停電腦棋手，返回後恢復。棋局與設定儲存格式不變。
