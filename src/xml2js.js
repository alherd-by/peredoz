function removeWhite(e) {
    e.normalize();
    for (let n = e.firstChild; n;) {
        if (n.nodeType == 3) {  // text node
            if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
                var nxt = n.nextSibling;
                e.removeChild(n);
                n = nxt;
            } else
                n = n.nextSibling;
        } else if (n.nodeType == 1) {  // element node
            removeWhite(n);
            n = n.nextSibling;
        } else                      // any other node
            n = n.nextSibling;
    }
    return e;
}

function escape(txt) {
    return txt.replace(/[\\]/g, "\\\\")
        .replace(/[\"]/g, '\\"')
        .replace(/[\n]/g, '\\n')
        .replace(/[\r]/g, '\\r');
}

function innerXml(node) {
    let s = ""
    if ("innerHTML" in node)
        s = node.innerHTML;
    else {
        var asXml = function (n) {
            var s = "";
            if (n.nodeType == 1) {
                s += "<" + n.nodeName;
                for (var i = 0; i < n.attributes.length; i++)
                    s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue || "").toString() + "\"";
                if (n.firstChild) {
                    s += ">";
                    for (var c = n.firstChild; c; c = c.nextSibling)
                        s += asXml(c);
                    s += "</" + n.nodeName + ">";
                } else
                    s += "/>";
            } else if (n.nodeType == 3)
                s += n.nodeValue;
            else if (n.nodeType == 4)
                s += "<![CDATA[" + n.nodeValue + "]]>";
            return s;
        };
        for (let c = node.firstChild; c; c = c.nextSibling)
            s += asXml(c);
    }
    return s;
}

function xml2json(xml) {
    const toObj = function (xml) {
        let o = {};
        if (xml.nodeType == 1) {   // element node ..
            if (xml.attributes.length)   // element with attributes  ..
                for (let i = 0; i < xml.attributes.length; i++) {
                    o["@" + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || "").toString();

                }
            if (xml.firstChild) { // element has child nodes ..
                let textChild = 0, cdataChild = 0, hasElementChild = false;
                for (let n = xml.firstChild; n; n = n.nextSibling) {
                    if (n.nodeType == 1) hasElementChild = true;
                    else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++; // non-whitespace text
                    else if (n.nodeType == 4) cdataChild++; // cdata section node
                }
                if (hasElementChild) {
                    if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
                        removeWhite(xml);
                        for (var n = xml.firstChild; n; n = n.nextSibling) {
                            if (n.nodeType == 3)  // text node
                                o["#text"] = escape(n.nodeValue);
                            else if (n.nodeType == 4)  // cdata node
                                o["#cdata"] = escape(n.nodeValue);
                            else if (o[n.nodeName]) {  // multiple occurence of element ..
                                if (o[n.nodeName] instanceof Array)
                                    o[n.nodeName][o[n.nodeName].length] = toObj(n);
                                else
                                    o[n.nodeName] = [o[n.nodeName], toObj(n)];
                            } else  // first occurence of element..
                                o[n.nodeName] = toObj(n);
                        }
                    } else { // mixed content
                        if (!xml.attributes.length)
                            o = escape(innerXml(xml));
                        else
                            o["#text"] = escape(innerXml(xml));
                    }
                } else if (textChild) { // pure text
                    if (!xml.attributes.length)
                        o = escape(innerXml(xml));
                    else
                        o["#text"] = escape(innerXml(xml));
                } else if (cdataChild) { // cdata
                    if (cdataChild > 1)
                        o = escape(innerXml(xml));
                    else
                        for (let n = xml.firstChild; n; n = n.nextSibling) {
                            o["#cdata"] = escape(n.nodeValue);
                        }
                }
            }
            if (!xml.attributes.length && !xml.firstChild) o = null;
        } else if (xml.nodeType == 9) { // document.node
            o = toObj(xml.documentElement);
        } else
            console.log("unhandled node type: " + xml.nodeType);
        return o;
    }
    if (xml.nodeType == 9) { // document node
        xml = xml.documentElement;
    }
    return toObj(removeWhite(xml));
}

function xml2js(xmlString) {
    return xml2json((new DOMParser()).parseFromString(xmlString, "text/xml"));
}

export {xml2js}
