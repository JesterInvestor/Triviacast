// Minimal shim for @react-native-async-storage/async-storage
// Provides async getItem/setItem/removeItem/clear so browser builds don't fail.
const storage = new Map();

module.exports = {
  async getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  async setItem(key, value) {
    storage.set(key, String(value));
  },
  async removeItem(key) {
    storage.delete(key);
  },
  async clear() {
    storage.clear();
  },
};
