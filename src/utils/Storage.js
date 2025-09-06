import Cookies from 'js-cookie';

const TokenKey = 'Admin-Token';

export function set(key, value) {
	Cookies.set(key, value, {expires: 7});
}

export function get(key) {
	return Cookies.get(key);
}

export function setToken(token) {
	set(TokenKey, token);
}

export function getToken() {
	return get(TokenKey) || '';
}

export function checkRoles(roles) {
	const rolesString = get('roles');
	if (rolesString) {
		const roleArray = JSON.parse(rolesString);
		for (let role of roles) {
			if (roleArray.includes(role)) return true;
		}
	}
	return false;
}
