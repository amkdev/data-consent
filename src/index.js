//import Cookie from 'cookie-universal'
import dialogPolyfill from 'dialog-polyfill'
import Promise from 'es6-promise'
import Storage from './storage'

function Consent(options) {
    this.renderBanner = options.banner || false;
    this.storage = new Storage('localstorage');
    this.listeners = [];
    this.specificListeners = {
        essential: [],
        functional: [],
        statistics: [],
        marketing: [],
    };
    this.state = {
        essential: this.renderBanner ? true : false,
        functional: false,
        statistics: false,
        marketing: false
    };
    this.dialog = null;
}

Consent.prototype.isAccepted = function(type) {
    var self = this;
    if (type) {
        return new Promise(function(resolve, reject) {
            self.specificListeners[type].push(resolve);
        });
    } else {
        return new Promise(function(resolve, reject) {
            self.listeners.push(resolve);
        });
    }
};

Consent.prototype.launch = function() {
    var storedState = this.storage.get('data-consent');
    if (storedState) {
        this.state = storedState;
        this.firePromises();
    } else {
        this.createDialog();
    }
};

Consent.prototype.forceOpen = function() {
    if (this.dialog === null) {
        this.createDialog();
    } else {
        this.dialog.showModal();
    }
};

Consent.prototype.firePromises = function() {
    var self = this;
    this.listeners.forEach(function(resolve) {
        resolve(self.state);
    });
    Object.keys(this.specificListeners).map(function(type, index) {
        if (self.state[type]) {
            self.specificListeners[type].forEach(function(resolve) {
                resolve(type);
            });
        }
    });
}

Consent.prototype.createDialog = function() {
    var self = this;
    this.dialog = getDialogElement();
    if (this.dialog === null) {
        console.error('Failed to create the cookie consent dialog, <template> missing?');
        return;
    }

    this.dialog.setAttribute('data-banner', this.renderBanner ? '1' : '0');

    this.dialog.querySelector('.data-consent-accept-all').addEventListener('change', function() {
        var checked = this.checked;
        Array.prototype.forEach.call(
            self.dialog.querySelectorAll('input[type=checkbox]'),
            function(el) {
                el.checked = checked;
            }
        );
        self.dialog.querySelector('button[type=submit][value=accept]').setAttribute(
            'data-selected',
            checked ? 'all' : 'some'
        );

    });

    var allSelected = true;
    Object.keys(this.state).map(function(type, index) {
        var input = self.dialog.querySelector('input[type="checkbox"][value="' + type + '"]');
        if (input) {
            input.checked = self.state[type];
            if (!self.state[type]) {
                allSelected = false;
            }
        }
    });
    this.dialog.querySelector('.data-consent-accept-all').checked = allSelected;

    this.dialog.addEventListener('close', function() {
        console.log(self.dialog.returnValue);
        switch (self.dialog.returnValue) {
        case 'accept':
            Object.keys(self.state).map(function(type, index) {
                var input = self.dialog.querySelector('input[type="checkbox"][value="' + type + '"]');
                self.state[type] = (input && input.checked);
            });
            self.storage.set('data-consent', self.state);
            self.firePromises();
            break;
        default:
            // Reopen the modal if it wasn't submitted.
            // This is ugly, but there is no other way to prevent
            // the modal from being closed by pressing the 'Escape' key.
            if (!self.state.essential) {
                self.dialog.showModal();
            }
            break;
        }
    });

    document.body.appendChild(this.dialog);
    this.dialog.showModal();
}

function getDialogElement() {
    var template = document.querySelector('#cookie-modal');
    var dialog;
    if (template === null) {
        return null;
    }
    if (template.content) {
        var fragment = document.importNode(template.content, true);
        dialog = fragment.querySelector('dialog');
    } else {
        var tmp = document.createElement('div') ;
        tmp.innerHTML = template.innerHTML;
        dialog = tmp.querySelector('dialog');
    }
    dialogPolyfill.registerDialog(dialog);

    return dialog;
}

export default Consent;
