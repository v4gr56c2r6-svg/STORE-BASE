import { auth, db } from "./js/firebase.js";
import { logoutUser } from "./js/auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const appMain = document.getElementById("appMain");
const loading = document.getElementById("authLoading");
const userEmail = document.getElementById("userEmail");
const dataStatus = document.getElementById("dataStatus");
const formMessage = document.getElementById("formMessage");
const productForm = document.getElementById("productForm");
const addButton = document.getElementById("addProductButton");
const productList = document.getElementById("productList");
const emptyState = document.getElementById("emptyState");
const noResults = document.getElementById("noResults");
const searchInput = document.getElementById("searchInput");
const productName = document.getElementById("productName");
const productSku = document.getElementById("productSku");
const productQuantity = document.getElementById("productQuantity");
const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editProductName = document.getElementById("editProductName");
const editProductSku = document.getElementById("editProductSku");
const editMessage = document.getElementById("editMessage");
const saveEditButton = document.getElementById("saveEditButton");

let currentUser = null;
let products = [];
let dataReady = false;
let stopWatchingProducts = null;
let editingProductId = null;

function setStatus(message, kind = "info") {
  dataStatus.textContent = message;
  dataStatus.dataset.kind = kind;
}

function setFormMessage(message, kind = "info") {
  formMessage.textContent = message;
  formMessage.dataset.kind = kind;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function productUpdatedAt(value) {
  const date = value?.toDate?.();
  if (!date) return "更新日時を取得中";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function updateSummary() {
  document.getElementById("productCount").textContent = formatNumber(products.length);
  document.getElementById("stockTotal").textContent = formatNumber(
    products.reduce((total, product) => total + product.quantity, 0)
  );
  document.getElementById("outOfStockCount").textContent = formatNumber(
    products.filter((product) => product.quantity === 0).length
  );
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function adjustStockButton(product, delta, label) {
  const button = document.createElement("button");
  button.className = "stock-button";
  button.type = "button";
  button.dataset.productId = product.id;
  button.dataset.delta = String(delta);
  button.setAttribute("aria-label", `${product.name}の在庫を1${label}`);
  button.textContent = delta > 0 ? "+" : "−";
  button.disabled = !dataReady || (delta < 0 && product.quantity === 0);
  return button;
}

function rowActionButton(product, action, label, isDanger = false) {
  const button = document.createElement("button");
  button.className = `row-action-button${isDanger ? " danger" : ""}`;
  button.type = "button";
  button.dataset.productId = product.id;
  button.dataset.action = action;
  button.textContent = label;
  button.setAttribute("aria-label", `${product.name}の商品を${label}`);
  button.disabled = !dataReady;
  return button;
}

function renderProducts() {
  const term = searchInput.value.trim().toLocaleLowerCase("ja-JP");
  const filtered = products.filter((product) =>
    `${product.name} ${product.sku}`.toLocaleLowerCase("ja-JP").includes(term)
  );

  productList.replaceChildren();
  updateSummary();
  emptyState.hidden = products.length > 0;
  noResults.hidden = products.length === 0 || filtered.length > 0;
  productList.hidden = products.length === 0 || filtered.length === 0;

  for (const product of filtered) {
    const row = document.createElement("article");
    row.className = "product-row";
    const main = document.createElement("div");
    main.className = "product-main";
    main.append(createTextElement("div", "product-name", product.name));
    main.append(createTextElement("div", "product-meta-mobile", product.sku ? `SKU ${product.sku} · ${productUpdatedAt(product.updatedAt)}` : productUpdatedAt(product.updatedAt)));
    row.append(main);
    row.append(createTextElement("div", "product-sku", product.sku || "—"));
    row.append(createTextElement("div", "product-quantity", formatNumber(product.quantity)));
    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    controls.append(adjustStockButton(product, -1, "減らす"));
    controls.append(adjustStockButton(product, 1, "増やす"));
    controls.append(createTextElement("span", "quantity-hint", productUpdatedAt(product.updatedAt)));
    row.append(controls);
    const actions = document.createElement("div");
    actions.className = "product-actions";
    actions.append(rowActionButton(product, "edit", "編集"));
    actions.append(rowActionButton(product, "delete", "削除", true));
    row.append(actions);
    productList.append(row);
  }
}

function showConnectionError(error) {
  dataReady = false;
  addButton.disabled = true;
  productName.disabled = true;
  productSku.disabled = true;
  productQuantity.disabled = true;
  renderProducts();
  if (error?.code === "permission-denied") {
    setStatus("在庫データへのアクセスが許可されていません。管理者がFirestoreのアクセスルールを確認してください。", "error");
  } else {
    setStatus("在庫データを読み込めませんでした。ネットワークとFirebaseの設定を確認してください。", "error");
  }
}

function watchProducts(user) {
  if (stopWatchingProducts) stopWatchingProducts();
  currentUser = user;
  dataReady = false;
  addButton.disabled = true;
  productName.disabled = true;
  productSku.disabled = true;
  productQuantity.disabled = true;
  setStatus("在庫データの接続を確認しています...");

  // The user ID is part of the Firestore path. Server-side rules must still restrict this path to that user.
  const productsRef = collection(db, "users", user.uid, "products");
  stopWatchingProducts = onSnapshot(
    query(productsRef, orderBy("updatedAt", "desc")),
    (snapshot) => {
      products = snapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          name: typeof data.name === "string" ? data.name : "（商品名なし）",
          sku: typeof data.sku === "string" ? data.sku : "",
          quantity: Number.isInteger(data.quantity) && data.quantity >= 0 ? data.quantity : 0,
          updatedAt: data.updatedAt
        };
      });
      dataReady = true;
      addButton.disabled = false;
      productName.disabled = false;
      productSku.disabled = false;
      productQuantity.disabled = false;
      setStatus("在庫データを読み込みました。", "success");
      renderProducts();
    },
    showConnectionError
  );
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!dataReady || !currentUser || !productForm.reportValidity()) return;

  const name = productName.value.trim();
  const sku = productSku.value.trim();
  const quantity = Number(productQuantity.value);
  if (!name || !Number.isInteger(quantity) || quantity < 0 || quantity > 999999) {
    setFormMessage("商品名と、0〜999,999の整数の在庫数を入力してください。", "error");
    return;
  }

  addButton.disabled = true;
  setFormMessage("商品を保存しています...");
  try {
    await addDoc(collection(db, "users", currentUser.uid, "products"), {
      name,
      sku,
      quantity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    productForm.reset();
    productQuantity.value = "0";
    setFormMessage("商品を追加しました。", "success");
  } catch (error) {
    setFormMessage(error?.code === "permission-denied"
      ? "保存できません。Firestoreの書き込みルールを確認してください。"
      : "商品を保存できませんでした。接続と設定を確認してください。", "error");
  } finally {
    addButton.disabled = !dataReady;
  }
});

productList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-product-id]");
  if (!button || !dataReady || !currentUser) return;
  const product = products.find((item) => item.id === button.dataset.productId);
  if (!product) return;

  if (button.dataset.action === "edit") {
    editingProductId = product.id;
    editProductName.value = product.name;
    editProductSku.value = product.sku;
    editMessage.textContent = "";
    editMessage.dataset.kind = "";
    saveEditButton.disabled = false;
    editDialog.showModal();
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(`「${product.name}」を削除します。\nこの操作は取り消せません。削除しますか？`);
    if (!confirmed) return;
    button.disabled = true;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "products", product.id));
      setFormMessage("商品を削除しました。", "success");
    } catch (error) {
      setFormMessage(error?.code === "permission-denied"
        ? "削除できません。Firestoreの削除ルールを確認してください。"
        : "商品を削除できませんでした。もう一度お試しください。", "error");
      button.disabled = false;
    }
    return;
  }

  const delta = Number(button.dataset.delta);
  if (![-1, 1].includes(delta) || (delta < 0 && product.quantity === 0)) return;

  button.disabled = true;
  try {
    const productRef = doc(db, "users", currentUser.uid, "products", product.id);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(productRef);
      if (!snapshot.exists()) throw new Error("Product was removed.");
      const quantity = Number(snapshot.data().quantity) || 0;
      transaction.update(productRef, {
        quantity: Math.max(0, quantity + delta),
        updatedAt: serverTimestamp()
      });
    });
  } catch (error) {
    setFormMessage(error?.code === "permission-denied"
      ? "在庫を更新できません。Firestoreの書き込みルールを確認してください。"
      : "在庫を更新できませんでした。もう一度お試しください。", "error");
  }
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!dataReady || !currentUser || !editingProductId || !editForm.reportValidity()) return;
  const name = editProductName.value.trim();
  const sku = editProductSku.value.trim();
  if (!name) {
    editMessage.textContent = "商品名を入力してください。";
    editMessage.dataset.kind = "error";
    return;
  }

  saveEditButton.disabled = true;
  editMessage.textContent = "商品情報を保存しています...";
  editMessage.dataset.kind = "";
  try {
    await updateDoc(doc(db, "users", currentUser.uid, "products", editingProductId), {
      name,
      sku,
      updatedAt: serverTimestamp()
    });
    editDialog.close();
    setFormMessage("商品情報を更新しました。", "success");
  } catch (error) {
    editMessage.textContent = error?.code === "permission-denied"
      ? "変更を保存できません。Firestoreの更新ルールを確認してください。"
      : "商品情報を保存できませんでした。もう一度お試しください。";
    editMessage.dataset.kind = "error";
    saveEditButton.disabled = false;
  }
});

function closeEditDialog() {
  editDialog.close();
  editingProductId = null;
}

document.getElementById("closeEditDialog").addEventListener("click", closeEditDialog);
document.getElementById("cancelEditButton").addEventListener("click", closeEditDialog);
editDialog.addEventListener("close", () => {
  editingProductId = null;
  editForm.reset();
});

searchInput.addEventListener("input", renderProducts);

document.getElementById("logoutButton").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  const result = await logoutUser();
  if (result.success) {
    window.location.replace("./login.html");
  } else {
    button.disabled = false;
    setStatus(result.message || "ログアウトできませんでした。", "error");
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    if (stopWatchingProducts) stopWatchingProducts();
    window.location.replace("./login.html");
    return;
  }

  loading.hidden = true;
  appMain.hidden = false;
  userEmail.textContent = user.email || "ログイン中";
  watchProducts(user);
});
