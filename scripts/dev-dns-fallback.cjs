const dns = require("node:dns");

const originalLookup = dns.lookup.bind(dns);
const publicResolver = new dns.Resolver();
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);

const fallbackErrors = new Set(["EAI_AGAIN", "EAI_FAIL", "ENODATA", "ENOTFOUND"]);

dns.lookup = function lookupWithPublicFallback(hostname, options, callback) {
  let lookupOptions = options;
  let done = callback;

  if (typeof options === "function") {
    done = options;
    lookupOptions = {};
  } else if (typeof options === "number") {
    lookupOptions = { family: options };
  }

  lookupOptions ||= {};

  return originalLookup(hostname, lookupOptions, (error, address, family) => {
    if (!error || !fallbackErrors.has(error.code)) {
      done(error, address, family);
      return;
    }

    const resolve = lookupOptions.family === 6
      ? publicResolver.resolve6.bind(publicResolver)
      : publicResolver.resolve4.bind(publicResolver);

    resolve(hostname, (fallbackError, addresses) => {
      if (fallbackError || addresses.length === 0) {
        done(error);
        return;
      }

      const resolvedFamily = lookupOptions.family === 6 ? 6 : 4;
      if (lookupOptions.all) {
        done(null, addresses.map((resolvedAddress) => ({
          address: resolvedAddress,
          family: resolvedFamily,
        })));
        return;
      }

      done(null, addresses[0], resolvedFamily);
    });
  });
};
