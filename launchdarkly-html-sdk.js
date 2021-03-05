(function(){

    var jsSdkUrl = "https://unpkg.com/launchdarkly-js-client-sdk/dist/ldclient.min.js";
    loadLdJsSDK(jsSdkUrl, initSdk);
    


    // Returns an array of all elements with ld-data-* attributes
    function updateAllElements() {
      console.log("HI")
      // you need to use data-ld because you can't select by attribute prefix
      document.querySelectorAll("[data-ld],[data-ld-class],[data-ld-text],[data-ld-width],[data-ld-height],[data-ld-src]").forEach(elem => updateElement(elem));
    }
    
    function updateElement(elem) {
      console.log("I AM ELEM")
      if(!window.ldclient) return;
      const attrs = Object.keys(elem.dataset).filter(value => {
        return value.startsWith('ld')
      }).forEach(key => {
        const attrName = key.substring(2).toLowerCase();
        console.log("WHOOPS", key, elem.dataset);
        const flagKey = elem.dataset[key];
        console.log(attrName, flagKey)
        const NO_RESULT = {};
        const value = ldclient.variation(flagKey, NO_RESULT);
        if (value == NO_RESULT) {
          return;
        }
        if (attrName == "text") {
          elem.innerText = value;
          return;
        }
        if (attrName.startsWith("style")) {
          const styleProp = attrName.substring(5);
          console.log(styleProp, value,'style')
          elem.style[styleProp] = value;
          return
        }
        if (attrName == "class") {
          const classes = Array.isArray(value) ? value.join(' ') : value;
          console.log("classes", classes);
          elem.setAttribute("class", classes)
          return;
        }
        elem.setAttribute(attrName, value)
      });      
    }

    // Dynamically loads the LaunchDarkly browser-JS SDK
    function loadLdJsSDK(url, handler){
      console.log('I AM IN LOAD')
        var scriptTag = document.createElement('script');
        scriptTag.src = url;
        scriptTag.crossOrigin = "anonymous";
    
        scriptTag.onload = handler;
        scriptTag.onreadystatechange = handler;
    
        document.head.appendChild(scriptTag);    
    }

    // Performs initial flag evaluations and sets up change handlers
    function initSdk() {
            console.log('I AM LOAD')

      let conf = getConfigAndUserFromMeta();
      console.log(conf);
      window.ldclient = LDClient.initialize(conf.clientid, conf.user, conf.config);
      window.ldclient.on('ready', () => {
        console.log("INIT")
        if (document.readyState == "complete") {
          console.log("HOLA")
          updateAllElements();
        } else {
          document.addEventListener("DOMContentLoaded", updateAllElements)
        }
        if(true || conf.config.stream == true) {
        window.ldclient.on('change',() => {
          console.log("change");
          updateAllElements();
        })
      }
      });
     
    }

    function getConfigAndUserFromMeta() {
        const BUILT_INS = [
            "key",
            "email",
            "firstName",
            "lastName",
            "name",
            "avatar",
            "ip",
            "country",
            "anonymous",
        ];


        let result = { user: { anonymous: true, custom: {} }, config: { privateAttributeNames: [] } };
        return Array.from(document.querySelectorAll("head meta[property^='ld:']"))
            .map(function (elem) {
                console.log(elem);
                const [_, kind, name] = elem.getAttribute("property").split(":", 3);
                return (
                    (kind &&
                    (name || kind == "clientid") && [
                        kind,
                        name,
                        elem.getAttribute("content"),
                        elem.hasAttribute("data-private"),
                        elem.hasAttribute("data-json"),
                    ]) ||
                    null
                );
            })
            .filter(Boolean)
            .reduce(function (
                acc,
                [kind, name, value, is_private, should_parse_json]
                ) {
                  console.log(kind, name, value, is_private, should_parse_json)
                    if (!acc.hasOwnProperty(kind) && kind !== "clientid") {
                        acc[kind] = {};
                    }
                    if (should_parse_json && (value != null || value != undefined)) {
                        try {
                        value = JSON.parse(value);
                        } catch (e) {
                        console.warn(
                            "ld meta: ",
                            kind,
                            name,
                            "invalid json value: ",
                            value
                            );
                        }
                    }

                    let target = acc[kind];
                    if (kind == "user") {
                        target = BUILT_INS.includes(name) ? acc.user : acc.user.custom;
                        if (
                        is_private &&
                        name != "key" &&
                        !acc.config.privateAttributeNames.includes(name)
                        ) {
                        acc.config.privateAttributeNames.push(name);
                        }
                    }
                    if (kind == "clientid") {
                        name = "clientid";
                        acc.clientid = value;
                        return acc;
                    }
                    if (target.hasOwnProperty(name)) {
                        target[name] = [target[name], value];
                    } else {
                        target[name] = value;
                    }
                    return acc;
            },
        result);
    }
}())