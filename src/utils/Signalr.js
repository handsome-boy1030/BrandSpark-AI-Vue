import * as signalR from "@microsoft/signalr";
import {getToken} from './Storage.js';

let connection = null; // 初始化为 null
const hubUrl = `${import.meta.env.VITE_APP_DEV}/chatHub`;

// 这是一个内部辅助函数，负责构建一个新地连接实例
// 不再对外导出，确保所有连接都通过模块内部的 connection 变量进行管理。
function createSignalRConnection() {
    const token = getToken();
    if (!token) {
        console.warn("无法创建 SignalR 连接：未找到认证 Token。");
        return null;
    }

    // 每次都创建一个新的、配置正确的连接
    return new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
            accessTokenFactory: () => getToken() // 使用工厂函数确保总是获取最新的Token
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000]) // 重连策略
        .build();
}

export default {
    // 获取当前的连接实例（现在这个方法只负责获取，不负责创建未管理的实例）
    getSignalRConnection() {
        return connection;
    },

    // 启动连接的函数，现在它会负责创建和保存实例
    startSignalRConnection() {
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            console.log("SignalR 已连接，无需重复启动。");
            return Promise.resolve();
        }

        // 使用内部辅助函数来构建连接实例
        connection = createSignalRConnection();

        if (connection) {
            return connection.start()
                .then(() => console.log("SignalR 连接成功。"))
                .catch(err => {
                    console.error("SignalR 连接失败: ", err);
                    // 清理失败的连接，以便下次可以重试
                    connection = null;
                });
        }
        return Promise.reject("无法创建 SignalR 连接。");
    },

    /**
     * 停止并清理 SignalR 连接。
     */
    stopSignalRConnection() {
        if (connection) {
            connection.stop();
            connection = null;
        }
    }
}