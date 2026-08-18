// ========================================
// IndexedDB 기본 설정
// ========================================

const DB_NAME = "context-stt-db";
const DB_VERSION = 1;

const STORE_NAME = "conversations";


// ========================================
// DB 열기
// ========================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    // DB를 처음 만들거나
    // 버전이 올라갔을 때 실행
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // conversations 저장소가 없으면 생성
      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        const store =
          db.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id",
            }
          );

        // 날짜 기준 검색/정렬을 위한 index
        store.createIndex(
          "createdAt",
          "createdAt",
          {
            unique: false,
          }
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}


// ========================================
// 대화 저장
// ========================================

export async function saveConversation(
  conversation
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    /*
      id가 없다면 자동 생성.

      crypto.randomUUID()를 사용해서
      각 대화마다 고유한 ID를 만든다.
    */

    const data = {
      ...conversation,

      id:
        conversation.id ||
        crypto.randomUUID(),

      createdAt:
        conversation.createdAt ||
        new Date().toISOString(),
    };

    const request =
      store.put(data);

    request.onsuccess = () => {
      resolve(data);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}


// ========================================
// 모든 대화 조회
// ========================================

export async function getAllConversations() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request =
      store.getAll();

    request.onsuccess = () => {
      const conversations =
        request.result || [];

      /*
        최신 대화가 위로 오도록
        createdAt 기준 내림차순 정렬
      */

      conversations.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

      resolve(conversations);
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}


// ========================================
// 특정 대화 하나 조회
// ========================================

export async function getConversation(
  id
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request =
      store.get(id);

    request.onsuccess = () => {
      resolve(
        request.result || null
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}


// ========================================
// 특정 대화 삭제
// ========================================

export async function deleteConversation(
  id
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request =
      store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}


// ========================================
// 모든 대화 기록 삭제
// ========================================

export async function clearConversations() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction =
      db.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const request =
      store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}