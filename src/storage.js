import Cookies from 'js-cookie'

function Storage(type,expiration) {
    this.type = type || 'localstorage';
    this.expiration = expiration || 365;
};

Storage.prototype.set = function (key, data) {
    if (this.type === 'localstorage') {
        window.localStorage.setItem(key, JSON.stringify(data));
    } else {
        Cookies.set(key, data, { expires: this.expiration });
    }
}

Storage.prototype.get = function (key) {
    try {
        if (this.type === 'localstorage') {
            var value = window.localStorage.getItem(key);
        } else {
            var value = Cookies.get(key);
        }
        return value && JSON.parse(value);
    } catch (e) {
        return false;
    }

}

export default Storage;
