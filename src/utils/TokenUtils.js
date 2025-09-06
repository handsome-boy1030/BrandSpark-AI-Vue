export function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1])); // 解析 JWT 的 payload
        const exp = payload.exp * 1000; // exp 为过期时间戳，单位是秒，需要转成毫秒
        return Date.now() > exp; // 判断是否过期
    } catch (e) {
        return true; // 如果解析失败，认为 token 过期
    }
}
