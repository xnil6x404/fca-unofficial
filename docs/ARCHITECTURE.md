# Architecture Overview

This document describes the codebase structure of **@dongdev/fca-unofficial** for contributors and developers who need to navigate or extend the project.

---

## Entry point and public API

- **`index.js`** — Exports the `login` function (CommonJS and ESM interop: `default`, `login`).
- **`index.d.ts`** — TypeScript declarations for `login`, credentials, `IFCAU_API`, event types, and options.

The only public API is `login(credentials, options?, callback?)`. All other functionality is exposed on the `api` object passed to the login callback.

---

## Login flow

| File | Role |
|------|------|
| `module/login.js` | Entry for login: normalizes callback/promise, merges options, optionally runs auto-update, then delegates to `loginHelper`. |
| `module/loginHelper.js` | Core login logic: AppState validation, cookie/session handling, optional external API login (iOS), GraphQL and MQTT setup, builds and returns the `api` object. |
| `module/config.js` | Loads `fca-config.json` (autoUpdate, mqtt, autoLogin, apiServer, apiKey, credentials). |
| `module/options.js` | `setOptions()`: applies boolean and special options (userAgent, proxy) used globally. |

Options include: `selfListen`, `listenEvents`, `listenTyping`, `updatePresence`, `forceLogin`, `autoMarkRead`, `autoReconnect`, `online`, `emitReady`, `userAgent`, `proxy`.

---

## HTTP layer

- **`src/utils/request.js`** — Shared `get`/`post` helpers, cookie jar, proxy support, defaults.
- **`src/api/http/httpGet.js`** — GET requests.
- **`src/api/http/httpPost.js`** — POST (e.g. GraphQL).
- **`src/api/http/postFormData.js`** — Form-data POST (e.g. uploads).
- **`src/utils/headers.js`** — Request headers.
- **`src/utils/cookies.js`** — Cookie handling.
- **`src/utils/client.js`** — Session/client state, `getAppState`, `saveCookies`, `parseAndCheckLogin`.

---

## API modules (`src/api/`)

API functions are attached to the `api` object in the login flow. They use the shared context (`ctx`), default funcs (`get`, `post`), and optional callback/promise.

### Messaging (`src/api/messaging/`)

- **sendMessage.js** — Send text, stickers, attachments, URLs, mentions.
- **editMessage.js**, **deleteMessage.js**, **unsendMessage.js** — Edit, delete, unsend.
- **getMessage.js** — Fetch a message by ID.
- **sendTypingIndicator.js** — Typing indicator.
- **setMessageReaction.js** — Message reactions.
- **forwardAttachment.js**, **uploadAttachment.js** — Attachments.
- **markAsRead.js**, **markAsReadAll.js**, **markAsDelivered.js**, **markAsSeen.js** — Read/delivery state.
- **createPoll.js** — Polls.
- **scheduler.js** — Scheduled messages (in-memory).

### Threads (`src/api/threads/`)

- **getThreadInfo.js**, **getThreadList.js**, **getThreadHistory.js**, **getThreadPictures.js** — Thread data and history.

### Thread/group actions (in `messaging/`)

- **getThreadInfo**, **getThreadList**, **getThreadHistory**, **getThreadPictures** (see threads).
- **setTitle.js**, **changeThreadColor.js**, **changeThreadEmoji.js**, **changeGroupImage.js** — Group appearance.
- **createNewGroup.js**, **addUserToGroup.js**, **removeUserFromGroup.js**, **changeAdminStatus.js**, **changeNickname.js** — Members and roles.
- **muteThread.js**, **deleteThread.js**, **changeArchivedStatus.js**, **changeBlockedStatus.js**, **handleMessageRequest.js** — Thread state and moderation.
- **searchForThread.js** — Search conversations.

### Users (`src/api/users/`)

- **getUserInfo.js**, **getUserInfoV2.js** — User profile data.
- **getUserID.js** — Resolve user ID from name/URL.

### Action / account (`src/api/action/`)

- **getCurrentUserID.js**, **logout.js** — Session.
- **changeAvatar.js**, **changeBio.js** — Profile.
- **handleFriendRequest.js**, **unfriend.js** — Friends.
- **enableAutoSaveAppState.js** — Periodic AppState save.
- **refreshFb_dtsg.js** — Token refresh.
- **addExternalModule.js**, **setPostReaction.js** — Extensions and reactions.

---

## Real-time (MQTT / WebSocket)

Real-time events (messages, typing, read receipts, etc.) are delivered via MQTT. The listener is started with `api.listenMqtt(callback)` and can be stopped via the returned function.

| Path | Role |
|------|------|
| `src/api/socket/listenMqtt.js` | Wires MQTT connection, seq ID, middleware, and callback; exposes `stopListening`. |
| `src/api/socket/core/connectMqtt.js` | MQTT connection and message handling. |
| `src/api/socket/core/getSeqID.js` | Fetches sequence ID for MQTT. |
| `src/api/socket/core/parseDelta.js` | Parses MQTT payloads into event objects. |
| `src/api/socket/core/getTaskResponseData.js` | Task response handling. |
| `src/api/socket/core/emitAuth.js` | Emits auth-related errors (e.g. not logged in, blocked). |
| `src/api/socket/detail/buildStream.js` | Builds WebSocket/MQTT stream (with optional proxy). |
| `src/api/socket/detail/constants.js` | MQTT topics and constants. |
| `src/api/socket/middleware/index.js` | Middleware pipeline: events pass through middleware before reaching the user callback. |

Event types include: `message`, `message_reply`, `event` (thread log events), `typ`, `read`, `read_receipt`, `message_reaction`, `presence`, `message_unsend`.

---

## Utilities and shared code

- **`src/utils/format.js`** — Type checking and formatting helpers.
- **`src/utils/constants.js`** — `getFrom`, `isReadableStream`.
- **`src/utils/loginParser.js`** — Login response parsing.
- **`src/utils/messageFormat.js`** — Message formatting.
- **`func/logger.js`** — Colored console logger.
- **`func/checkUpdate.js`** — Optional version check / auto-update.

---

## Database (optional)

- **`src/database/models/`** — Sequelize models (e.g. `user.js`, `thread.js`).
- **`src/database/models/index.js`** — Model registration.
- **`src/database/threadData.js`**, **userData.js** — Data access using those models.

Used for optional persistence; the core API works without them.

---

## Data flow (simplified)

1. **Login** — User calls `login(credentials, options?, callback)`. `loginHelper` validates AppState or performs email/password (or external API) login, then builds session (cookies, `fb_dtsg`, etc.) and the `api` object.
2. **API calls** — Each `api.*` method uses `defaultFuncs.get`/`post` and shared `ctx` (cookies, options). Most methods support both callback and Promise.
3. **Real-time** — `api.listenMqtt(callback)` starts MQTT, fetches seq ID, parses deltas, runs middleware, then invokes the callback for each event. `stopListening()` closes the listener.

---

## Configuration

- **Runtime options** — Set via `api.setOptions({ ... })` (see `module/options.js`).
- **File config** — Optional `fca-config.json` in the current working directory (see `module/config.js`): `autoUpdate`, `mqtt`, `autoLogin`, `apiServer`, `apiKey`, `credentials`.

For full API usage and examples, see [DOCS.md](../DOCS.md) and [README.md](../README.md).
