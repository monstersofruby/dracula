/*
reglib version 1.1
Copyright 2008
Released under MIT license
http://code.google.com/p/reglib/
*/

// you can rename window.reg to whatever you want
window.reg = (function(){

var reg = {};

// this adds reg's dom helper functions and event functions to the 
// global namespace. don't call this method if you want to keep your 
// global namespace clean. alternatively you can individually import 
// certain sections, this is just a convenient way to do them all.
reg.importAll = function() {
	var errStrings = [];
	try { reg.importSelectorAPI(); }
	catch (err) { errStrings.push(err.message); }
	try { reg.importHelperFunctions(); }
	catch (err) { errStrings.push(err.message); }
	try { reg.importEventFunctions(); }
	catch (err) { errStrings.push(err.message); }
	if (errStrings.length > 0) { throw new Error(errStrings.join("\n")); }
};
function globalError(name) {
	return "reglib tried to add \""+name+"\" to global namespace but \""+name+"\" already existed.";
}
if (window.Node && Node.prototype && !Node.prototype.contains) {
	Node.prototype.contains = function (arg) {
		return !!(this.compareDocumentPosition(arg) & 16);
	}
}

// #############################################################################
// #### SELECTORS ##############################################################
// #############################################################################

/*
A CSS-like selector API focusing on matching not traversal:
- new reg.Selector(selectorString)
- new reg.Selector(selectorString).matches(someElement)

For example:
var sel = new reg.Selector('div#foo > ul.bar > li');
var item = document.getElementById('myListItem');
if (sel.matches(item)) { ... }
*/

// precompiled patterns
var expressions = {
	leadSpace:  new RegExp("^\\s+"),
	tagName:    new RegExp("^([a-z_][a-z0-9_-]*)","i"),
	wildCard:   new RegExp("^\\*([^=]|$)"),
	className:  new RegExp("^(\\.([a-z0-9_-]+))","i"),
	id:         new RegExp("^(#([a-z0-9_-]+))","i"),
	att:        new RegExp("^(@([a-z0-9_-]+))","i"),
	matchType:  new RegExp("(^\\^=)|(^\\$=)|(^\\*=)|(^~=)|(^\\|=)|(^=)"),
	spaceQuote: new RegExp("^\\s+['\"]")
};

// constructor
reg.Selector=function(selString) {
	var exp = expressions;
	this.items = []; // for each comma-separated selector, this array has an item
	var itms = []; // this will be added to this.items
	var count = 0;
	var origSel = selString;
	while (selString.length>0) {
		if (count > 100) { throw new Error("failed parsing '"+origSel+"' stuck at '"+selString+"'"); }
		// get rid of any leading spaces
		var leadSpaceChopped = false;
		if (exp.leadSpace.test(selString)) {
			selString=selString.replace(exp.leadSpace,'');
			leadSpaceChopped = true;
		}

		// find tag name
		var tagNameMatch = exp.tagName.exec(selString);
		if (tagNameMatch) {
			if (itms.length > 0 && itms[itms.length-1].name=='tag') { itms.push({name:'descendant'}); }
			itms.push({name:'tag',tagName:tagNameMatch[1].toLowerCase()});
			selString=selString.substring(tagNameMatch[1].length);
			tagNameMatch=null;
			continue;
		}
		// explicit wildcard selector
		if (exp.wildCard.test(selString)) {
			if (itms.length > 0 && itms[itms.length-1].name=='tag') { itms.push({name:'descendant'}); }
			itms.push({name:'tag',tagName:'*'});
			selString = selString.substring(1);
			continue;
		}
		var classMatch = exp.className.exec(selString);
		var idMatch = exp.id.exec(selString);
		var attMatch = exp.att.exec(selString);
		if (classMatch || idMatch || attMatch) {
			// declare descendant if necessary
			if (leadSpaceChopped && itms.length>0 && itms[itms.length-1].name=='tag') { itms.push({name:'descendant'}); }
			// create a tag wildcard * if necessary
			if (itms.length==0 || itms[itms.length-1].name!='tag') { itms.push({name:'tag',tagName:'*'}); }
			var lastTag = itms[itms.length-1];
			// find class name, like .entry
			if (classMatch) {
				if (!lastTag.classNames) {
					lastTag.classNames = [classMatch[2]];
				} else {
					lastTag.classNames.push(classMatch[2]);
				}
				selString=selString.substring(classMatch[1].length);
				classMatch=null;
				continue;
			}
			// find id, like #content
			if (idMatch) {
				lastTag.id=idMatch[2];
				selString=selString.substring(idMatch[1].length);
				idMatch=null;
				continue;
			}
			// find attribute selector, like @src
			if (attMatch) {
				if (!lastTag.attributes) {
					lastTag.attributes = [{name:attMatch[2]}];
				} else {
					lastTag.attributes.push({name:attMatch[2]});
				}
				selString=selString.substring(attMatch[1].length);
				attMatch=null;
				continue;
			}
		}
		// find attribute value specifier
		var mTypeMatch=exp.matchType.exec(selString);
		if (mTypeMatch) {
			// this will determine how the matching is done
			// (lastTag should still be hanging around)
			if(lastTag && lastTag.attributes && !lastTag.attributes[lastTag.attributes.length-1].value){

				var lastAttribute = lastTag.attributes[lastTag.attributes.length-1];
				lastAttribute.matchType = mTypeMatch[0];
				
				selString=selString.substring(lastAttribute.matchType.length);
				if(selString.charAt(0)!='"'&&selString.charAt(0)!="'"){
					if(exp.spaceQuote.test(selString)){selString=selString.replace(exp.leadSpace,'');}
					else{throw new Error(origSel+" is invalid, single or double quotes required around attribute values");}
				}
				// it is enclosed in quotes, end is closing quote
				var q=selString.charAt(0);
				var lastQInd=selString.indexOf(q,1);
				if(lastQInd==-1){throw new Error(origSel+" is invalid, missing closing quote");}
				while(selString.charAt(lastQInd-1)=='\\'){
					lastQInd=selString.indexOf(q,lastQInd+1);
					if(lastQInd==-1){throw new Error(origSel+" is invalid, missing closing quote");}
				}
				lastAttribute.value=selString.substring(1,lastQInd);
				if      ('~=' == lastAttribute.matchType) { lastAttribute.valuePatt = new RegExp("(^|\\s)"+lastAttribute.value+"($|\\s)"); }
				else if ('|=' == lastAttribute.matchType) { lastAttribute.valuePatt = new RegExp("^"+lastAttribute.value+"($|\\-)"); }
				selString=selString.substring(lastAttribute.value.length+2);// +2 for the quotes
				continue;
			} else {
				throw new Error(origSel+" is invalid, "+mTypeMatch[0]+" appeared without preceding attribute identifier");
			}
			mTypeMatch=null;
		}
		// find child selector
		if (selString.charAt(0) == '>') {
			itms.push({name:'child'});
			selString=selString.substring(1);
			continue;
		}
		// find next sibling selector
		if (selString.charAt(0) == '+') {
			itms.push({name:'nextSib'});
			selString=selString.substring(1);
			continue;
		}
		// find after sibling selector
		if (selString.charAt(0) == '~') {
			itms.push({name:'followingSib'});
			selString=selString.substring(1);
			continue;
		}
		// find the comma separator
		if (selString.charAt(0) == ',') {
			this.items.push(itms);
			itms = [];
			selString = selString.substring(1);
			continue;
		}
		count++;
	}
	this.items.push(itms);
	this.selectorString=origSel;
	// do some structural validation
	for (var a=0;a<this.items.length;a++){
		var itms = this.items[a];
		if (itms.length==0) { throw new Error("illegal structure: '"+origSel+"' contains an empty set"); }
		if (itms[0].name!='tag') { throw new Error("illegal structure: '"+origSel+"' contains a dangling relation"); }
		if (itms[itms.length-1].name!='tag') { throw new Error("illegal structure: '"+origSel+"' contains a dangling relation"); }
		for(var b=1;b<itms.length;b++){
			if(itms[b].name!='tag'&&itms[b-1].name!='tag'){ throw new Error("illegal structure: '"+origSel+"' contains doubled up relations"); }
		}
	}
}

// returns string suitable for querySelector() and querySelectorAll()
function toQuerySelectorString(sel) {
	if (!sel.qss) {
		var itemStrings = [];
		for (var i=0; i<sel.items.length; i++) {
			var result = '';
			var item = sel.items[i];
			for (var j=0; j<item.length; j++) {
				var des = item[j];
				if (des.name=='tag') {
					result += des.tagName;
					if (des.classNames) { result += "." + des.classNames.join("."); }
					if (des.id) { result += '#' + des.id; }
					if (des.targeted) {  result += ':target'; }
					if (des.attributes) {
						
						for (var k=0; k<des.attributes.length; k++) {
							result += '[' + des.attributes[k].name;
							if (des.attributes[k].matchType) {
								result += des.attributes[k].matchType;
								result += '"'+des.attributes[k].value.replace(/"/,'\\"')+'"';
							}
							result += ']';
						}
						
					}
				} else if (des.name=='descendant') {
					result += ' ';
					continue;
				} else if (des.name=='child') {
					result += ' > ';
					continue;
				} else if (des.name=='followingSib') {
					result += ' ~ ';
					continue;
				} else if (des.name=='nextSib') {
					result += ' + ';
					continue;
				}
			}
			itemStrings.push(result);
		}
		sel.qss = itemStrings.join(', ');
	}
	return sel.qss;
}

// match against an element
reg.Selector.prototype.matches = function(el) {
	if (!el) { throw new Error('no element provided'); }
	if (el.nodeType != 1) { throw new Error(this.selectorString+' cannot be evaluated against element of type '+el.nodeType); }
	commas:for (var a=0;a<this.items.length;a++) { // for each comma-separated selector
		var tempEl = el;
		var itms = this.items[a];
		for (var b=itms.length-1; b>=0; b--) { // loop backwards through the items
			var itm = itms[b];
			if (itm.name == 'tag') {
				if (!matchIt(tempEl, itm)) {
					// these relational selectors require more extensive searching
					if (tempEl && b < itms.length-1 && itms[b+1].name=='descendant') { tempEl=tempEl.parentNode; b++; continue; }
					else if (tempEl && b < itms.length-1 && itms[b+1].name=='followingSib') { tempEl=tempEl.previousSibling; b++; continue; }
					else { continue commas; } // fail this one
				}
			}
			else if (itm.name == 'nextSib') { tempEl = previousElement(tempEl); }
			else if (itm.name == 'followingSib') { tempEl = previousElement(tempEl); }
			else if (itm.name == 'child') { tempEl = tempEl.parentNode; }
			else if (itm.name == 'descendant') { tempEl = tempEl.parentNode; }
		}
		return true;
	}
	return false;
};

// subroutine for matches() above
function matchIt(el, itm) {
	// try to falsify as soon as possible
	if (!el) { return false; }
	if (el.nodeName.toLowerCase()!=itm.tagName && itm.tagName!='*') { return false; }
	if (itm.classNames) {
		 for (var i=0; i<itm.classNames.length; i++) {
			if (!hasClassName(el, itm.classNames[i])) {
				return false;
			}
		}
	}
	if (itm.id && el.id != itm.id) { return false; }
	if (itm.attributes) {
		for (var i=0; i<itm.attributes.length; i++) {
			var itmAtt = itm.attributes[i];
			if (typeof el.hasAttribute != 'undefined') {
				if (!el.hasAttribute(itmAtt.name)) { return false; }
				var att = el.getAttribute(itmAtt.name);
			}else{
				if(el.nodeType!=1) {return false;}
				var att = el.getAttribute(itmAtt.name,2);//ie6/7 returns fully resolved href but ,2 fixes that
				if(itmAtt.name=='class'){att=el.className;}//todo:remove this line
				else if(itmAtt.name=='for'){att=el.htmlFor;}//todo:and this one
				if(!att){return false;}
			}
			if (itmAtt.value) {
				if (itmAtt.matchType=='^='){
					if (att.indexOf(itmAtt.value)!=0){return false;}
				} else if (itmAtt.matchType=='*='){
					if (att.indexOf(itmAtt.value)==-1){return false;}
				} else if (itmAtt.matchType=='$='){
					if (att.indexOf(itmAtt.value)!=att.length-itmAtt.value.length){return false;}
				} else if (itmAtt.matchType=='='){
					if (att!=itmAtt.value){return false;}
				} else if ('|='==itmAtt.matchType || '~='==itmAtt.matchType){
					if (!itmAtt.valuePatt.test(att)){return false;}
				}else{
					if(!itmAtt.matchType){throw new Error("illegal structure, parsed selector cannot have null or empty attribute match type");}
					else{throw new Error("illegal structure, parsed selector cannot have '"+itm.matchType+"' as an attribute match type");}
				}
			}
		}
	}
	return true;
}

// gets the tag names that the selector represents
function getTagNames(sel) {
	var hash = {}; // this avoids dupes
	for (var a=0;a<sel.items.length;a++){
		hash[sel.items[a][sel.items[a].length-1].tagName]=null;
	}
	var result = [];
	for (var tag in hash){if(hash.hasOwnProperty(tag)){result.push(tag);}}
	return result;
}

reg.importSelectorAPI = function() {
	if (window.Selector) { throw new Error(globalError("Selector")); }
	window.Selector = reg.Selector;
};

// #############################################################################
// #### DOM HELPERS ############################################################
// #############################################################################

/*
A bunch of DOM convenience methods (alias names in braces):

CLASSNAMES
- reg.addClassName(el, cName)..............................{acn}
- reg.getElementsByClassName(cNames[, ctxNode[, tagName]]).{gebcn}
- reg.hasClassName(el, cName)..............................{hcn}
- reg.matchClassName(el, regexp)...........................{mcn}
- reg.removeClassName(el, cName)...........................{rcn}
- reg.switchClassName(el, cName1, cName2)..................{scn}
- reg.toggleClassName(el, cName)...........................{tcn}

SELECTORS
- reg.elementMatchesSelector(el, selString)................{matches}
- reg.getElementsBySelector(selString[, ctxNode])..........{gebs}

OTHER
- reg.elementText(el)......................................{elemText}
- reg.getElementById().....................................{gebi}
- reg.getElementsByTagName(tagName[, ctxNode]).............{gebtn}
- reg.getParent(el, selString)
- reg.innerWrap(el, wrapperEl)
- reg.insertAfter(insertMe, afterThis)
- reg.newElement(tagName[, attObj[, contents]])............{elem}
- reg.nextElement(el)......................................{nextElem}
- reg.outerWrap(el, wrapperEl)
- reg.previousElement(el)..................................{prevElem}
*/

var clPatts={};// cache compiled classname regexps
var cSels={};// cache compiled selectors

// TEST FOR CLASS NAME
function hasClassName(element, cName) {
	if (!clPatts[cName]) { clPatts[cName] = new RegExp("(^|\\s)"+cName+"($|\\s)"); }
	return element.className && clPatts[cName].test(element.className);
}

// ADD CLASS NAME
function addClassName(element, cName) {
	if (!hasClassName(element, cName)) {
		element.className += ' ' + cName;
	}
}

// REMOVE CLASS NAME
function removeClassName(element, cName) {
	if (!clPatts[cName]) { clPatts[cName] = new RegExp("(^|\\s+)"+cName+"($|\\s+)"); }
	element.className = element.className.replace(clPatts[cName], ' ');
}

// TOGGLE CLASS NAME
function toggleClassName(element, cName) {
	if (hasClassName(element, cName)) { removeClassName(element, cName); }
	else { addClassName(element, cName); }
}

// SWITCH CLASS NAME A->B, B->A
function switchClassName(element, cName1, cName2) {
	if (cName1 == cName2) { throw new Error("cName1 and cName2 both equal "+cName1); }
	var has1 = hasClassName(element, cName1);
	var has2 = hasClassName(element, cName2);
	if (has1 && has2) { removeClassName(element, cName2); }
	else if (!has1 && !has2) { addClassName(element, cName1); }
	else if (has1) { removeClassName(element, cName1); addClassName(element, cName2); }
	else { removeClassName(element, cName2); addClassName(element, cName1); }
}

// TEST FOR CLASS NAME BY REGEXP
function matchClassName(element, pattern){
	var cNames = element.className.split(' ');
	for (var a=0; a<cNames.length; a++){
		var matches = cNames[a].match(pattern);
		if (matches) { return matches; }
	}
	return null;
}

// TEST AGAINST SELECTOR
function elementMatchesSelector(element, selString){
	if(!cSels[selString]){cSels[selString]=new reg.Selector(selString);}
	return cSels[selString].matches(element);
}

// FIND PREVIOUS ELEMENT
function previousElement(el) {
	var prev = el.previousSibling;
	while(prev && prev.nodeType!=1){prev=prev.previousSibling;}
	return prev;
}

// FIND NEXT ELEMENT
function nextElement(el) {
	var next = el.nextSibling;
	while(next && next.nodeType!=1){next=next.nextSibling;}
	return next;
}

// ADD INNER WRAPPER
function innerWrap(el, wrapperEl) {
	var nodes = el.childNodes;
	while (nodes.length > 0) {
		var myNode = nodes[0];
		el.removeChild(myNode);
		wrapperEl.appendChild(myNode);
	}
	el.appendChild(wrapperEl);
}

// ADD OUTER WRAPPER
function outerWrap(el, wrapperEl) {
	el.parentNode.insertBefore(wrapperEl, el);
	el.parentNode.removeChild(el);
	wrapperEl.appendChild(el);
}

// GET PARENT
function getParent(el, selString) {
	var parsedSel = new reg.Selector(selString);
	while (el.parentNode) {
		el = el.parentNode;
		if (el.nodeType==1 && parsedSel.matches(el)) { return el; }
	}
	return null;
}

// INSERT AFTER
function insertAfter(insertMe, afterThis){
	var beforeThis = afterThis.nextSibling;
	var parent = afterThis.parentNode;
	if (beforeThis) { parent.insertBefore(insertMe, beforeThis); }
	else { parent.appendChild(insertMe); }
}

// SHORTCUT FOR BUILDING ELEMENTS
function newElement(name, atts, content) {
	// name: e.g. 'div', 'div.foo', 'div#bar', 'div.foo#bar', 'div#bar.foo'
	// atts: (optional) e.g. {'href':'page.html','target':'_blank'}
	// content: (optional) either a string, or an element, or an arry of strings or elements
	if (name.indexOf('.') + name.indexOf('#') > -2) {
		var className = (name.indexOf('.') > -1) ? name.replace(/^.*\.([^\.#]*).*$/,"$1") : "";
		var id = (name.indexOf('#') > -1) ? name.replace(/^.*#([^\.#]*).*$/,"$1") : "";
		name = name.replace(/^([^\.#]*).*$/,'$1');
	}
	var e = document.createElement(name);
	if (className) { e.className = className; }
	if (id) { e.id = id; }
	if (atts) {
		for (var key in atts) {
			// setAttribute() has shaky support, try direct methods first
			if (!atts.hasOwnProperty(key)) { continue; }
			if (key == 'class') { e.className = e.className ? e.className += ' ' + atts[key] : atts[key]; }
			else if (key == 'for') { e.htmlFor = atts[key]; }
			else if (key.indexOf('on') == 0) { e[key] = atts[key]; }
			else {
				e.setAttribute(key, atts[key]);
			}
		}
	}
	if (content) {
		if (!(content instanceof Array)) {
			content = [content];
		}
		for (var a=0; a<content.length; a++) {
			if (typeof content[a] == 'string') {
				e.appendChild(document.createTextNode(content[a]));
			}else{
				e.appendChild(content[a]);
			}
		}
	}
	if (name.toLowerCase() == 'img' && !e.alt) { e.alt = ''; }
	return e;
}

// GRAB JUST THE TEXTUAL DATA OF AN ELEMENT
function elementText(el) {
	// <a id="foo" href="page.html">click <b>here</b></a>
	// elementText(document.getElementById('foo')) == "click here"
	var r = '';
	if (el.alt) { r += el.alt; }
	r += el.innerHTML.replace(/<[a-z0-9_-]+ [^>]+alt="([^">]+)[^>]+>/ig,'$1').replace(/<[^>]+>/ig,'');
	var d = newElement('div');
	d.innerHTML = r;
	r = (d.childNodes[0]) ? d.childNodes[0].data : '';
	d = null;
	return r;
}

// GET ELEMENT BY ID
function getElementById(id) { return document.getElementById(id); }

// GET ELEMENTS BY TAG NAME
function getElementsByTagName(tag, contextNode) {
	if(!contextNode){contextNode=document;}
	return contextNode.getElementsByTagName(tag);
}

// GET ELEMENTS BY SELECTOR
var classTest = /^\s*([a-z0-9_-]+)?\.([a-z0-9_-]+)\s*$/i;
var idTest = /^\s*([a-z0-9_-]+)?\#([a-z0-9_-]+)\s*$/i;
function getElementsBySelector(selString, contextNode) {
	contextNode = contextNode || window.document.documentElement;
	var result = [];
	var cMat, iMat;
	if (cMat = selString.match(classTest)) {
		var cl = cMat[2];
		var tg = cMat[1];
		result = reg.gebcn(cl, contextNode, tg);
	} else if (iMat = selString.match(idTest)) {
		var id = iMat[2];
		var tg = iMat[1];
		var el = reg.gebi(id);
		if (el && contextNode.contains(el) && reg.matches(el, selString)) { result[0] = el; }
	} else {
		if (!cSels[selString]) { cSels[selString] = new reg.Selector(selString); }
		var sel = cSels[selString];
		if (contextNode.querySelectorAll) {
			var qlist = contextNode.querySelectorAll(toQuerySelectorString(sel));
			for (var i=0; i<qlist.length; i++) {
				result[result.length] = qlist[i];
			}
		} else {
			var tagNames = getTagNames(sel);
			for (var a=0; a<tagNames.length; a++) {
				var els = getElementsByTagName(tagNames[a], contextNode);
				for (var b=0, el; el=els[b++];) {
					if (el.nodeType!=1) { continue; }
					if (sel.matches(el)) { result.push(el); }
				}
			}
		}
	}
	return result;
}

// GET ELEMENTS BY CLASS NAME
function getElementsByClassName(classNames, contextNode, tag) {
	contextNode = (contextNode) ? contextNode : document;
	tag = (tag) ? tag.toLowerCase() : '*';
	var results = [];
	if (document.getElementsByClassName) {
		// traverse natively
		var liveList = contextNode.getElementsByClassName(classNames);
		if (tag != '*') {
			for (var i=0; i<liveList.length; i++) {
				var el = liveList[i];
				if (tag == el.nodeName.toLowerCase()) {
					results.push(el);
				}
			}
		} else {
			for (var i=0; i<liveList.length; i++) { results.push(liveList[i]); }
		}
	} else {
		classNames = classNames.split(/\s+/);
		if (document.evaluate) {
			// traverse w/ xpath
			var xpath = ".//"+tag;
			var len = classNames.length;
			for(var i=0; i<len; i++) {
				xpath += "[contains(concat(' ', @class, ' '), ' " + classNames[i] + " ')]";
			}
			var xpathResult = document.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, xpathResult);
			var el;
			while (el = xpathResult.iterateNext()) {
				results.push(el);
			}
		} else {
			// traverse w/ dom
			var els = (tag=='*'&&contextNode.all) ? contextNode.all : getElementsByTagName(tag,contextNode);
			elements:for (var i=0,el;el=els[i++];) {
				for (var j=0; j<classNames.length; j++) {
					if (!hasClassName(el, classNames[j])) { continue elements; }
				}
				results.push(el);
			}
		}
	}
	return results;
}

var helpers = {
	hasClassName:           hasClassName,
	addClassName:           addClassName,
	removeClassName:        removeClassName,
	toggleClassName:        toggleClassName,
	switchClassName:        switchClassName,
	matchClassName:         matchClassName,
	elementMatchesSelector: elementMatchesSelector,
	previousElement:        previousElement,
	nextElement:            nextElement,
	innerWrap:              innerWrap,
	outerWrap:              outerWrap,
	getParent:              getParent,
	insertAfter:            insertAfter,
	newElement:             newElement,
	elementText:            elementText,
	getElementById:         getElementById,
	getElementsByTagName:   getElementsByTagName,
	getElementsBySelector:  getElementsBySelector,
	getElementsByClassName: getElementsByClassName
};

// aliases
helpers.hcn      = helpers.hasClassName;
helpers.acn      = helpers.addClassName;
helpers.rcn      = helpers.removeClassName;
helpers.tcn      = helpers.toggleClassName;
helpers.scn      = helpers.switchClassName;
helpers.mcn      = helpers.matchClassName;
helpers.matches  = helpers.elementMatchesSelector;
helpers.prevElem = helpers.previousElement;
helpers.nextElem = helpers.nextElement;
helpers.elem     = helpers.newElement;
helpers.elemText = helpers.elementText;
helpers.gebi     = helpers.getElementById;
helpers.gebtn    = helpers.getElementsByTagName;
helpers.gebs     = helpers.getElementsBySelector;
helpers.gebcn    = helpers.getElementsByClassName;

// add it globally
reg.importHelperFunctions = function() {
	var errStrings = [];
	for (var func in helpers) {
		if(!helpers.hasOwnProperty(func)) { continue; }
		if (window[func]) { errStrings.push(globalError(func)); }
		else { window[func] = helpers[func]; }
	}
	if (errStrings.length > 0) { throw new Error(errStrings.join("\n")); }
};

// add it to reg
for (var func in helpers) {
	if(!helpers.hasOwnProperty(func)) { continue; }
	if (reg[func]) { throw new Error("Already exists under reg: "+func); }
	else { reg[func] = helpers[func]; }
}

// #############################################################################
// #### X-BROWSER EVENTS #######################################################
// #############################################################################

/*
Event attachment and detachment:
- reg.addEvent(elmt,evt,handler,cptr)
- reg.calcelDefault(evt)
- reg.getTarget(evt)
*/

var memEvents = {};
var aMemInd = 0;
function rememberEvent(elmt,evt,handle,cptr,cleanable){
	var memInd = aMemInd++;
	var key = "mem"+memInd;
	memEvents[key] = {
		element: elmt,
		event: evt,
		handler: handle,
		capture: cptr,
		cleanable: cleanable
	};
	return memInd;
}
// if "all" is true, it nukes all events
// otherwise only those created with "cleanable" flag
function cleanup(all){
	for (var key in memEvents) {
		var matches = key.match(/^mem(\d+)$/);
		if (!matches) { continue; }
		if (all || (memEvents[key].cleanable && !document.documentElement.contains(memEvents[key].element))) {
			removeEvent(parseInt(matches[1]));
			//console.log("cleaning up event: "+matches[1]);
		}
	}
}
window.setInterval(function(){
	cleanup(false);
},10000);

// get the element on which the event occurred
function getTarget(e) {
	if (!e) { e = window.event; }
	if (e.target) { var targ = e.target; }
	else if (e.srcElement) { var targ = e.srcElement; }
	if (targ.nodeType == 3) { targ = targ.parentNode; } // safari hack
	return targ;
}

// get the element on which the event occurred
function getRelatedTarget(e) {
	if (!e) { e = window.event; }
	var rTarg = e.relatedTarget;
	if (!rTarg) {
		if ('mouseover'==e.type) { rTarg = e.fromElement; }
		if ('mouseout'==e.type) { rTarg = e.toElement; }
	}
	return rTarg;
}

// cancel default action
function cancelDefault(e) {
	if (typeof e.preventDefault != 'undefined') { e.preventDefault(); return; }
	e.returnValue=false;
}

// cancel bubble
function cancelBubble(e) {
	if (typeof e.stopPropagation != 'undefined') { e.stopPropagation(); return; }
	e.cancelBubble=true;
}

// generic event adder, plus memory leak prevention
// returns an int mem that you can use to later remove that event removeEvent(mem)
// cptr defaults false
function addEvent(elmt,evt,handler,cptr,cleanable) {
	cptr=(cptr)?true:false;
	cleanable=(cleanable)?true:false;
	if(elmt.addEventListener){
		elmt.addEventListener(evt,handler,cptr);
		return rememberEvent(elmt,evt,handler,cptr,cleanable);
	}else if(elmt.attachEvent){
		var actualHandler = function(){handler.call(elmt,window.event);};
		elmt.attachEvent("on"+evt,actualHandler);
		return rememberEvent(elmt,evt,actualHandler,cptr,cleanable);
	}
}

// event remover
function removeEvent(memInt) {
	var memProp = "mem"+memInt;
	var eo = memEvents[memProp];
	if (eo) {
		var el=eo.element;
		if(el.removeEventListener) {
			el.removeEventListener(eo.event, eo.handler, eo.capture);
			delete memEvents[memProp];
			return true;
		} else if(el.detachEvent) {
			el.detachEvent('on'+eo.event, eo.handler);
			delete memEvents[memProp];
			return true;
		}
	}
	return false;
}

// fight memory leaks in ie
addEvent(window,'unload',function(){cleanup(true)});

var events = {
	getTarget:        getTarget,
	getRelatedTarget: getRelatedTarget,
	cancelDefault:    cancelDefault,
	addEvent:         addEvent,
	removeEvent:      removeEvent,
	cancelBubble:     cancelBubble
};

reg.importEventFunctions = function() {
	var errStrings = [];
	for (var func in events) {
		if(!events.hasOwnProperty(func)) { continue; }
		if (window[func]) { errStrings.push(globalError(func)); }
		else { window[func] = events[func]; }
	}
	if (errStrings.length > 0) { throw new Error(errStrings.join("\n")); }
};

for (var func in events) {
	if(!events.hasOwnProperty(func)) { continue; }
	if (reg[func]) { throw new Error("Already exists under reg: "+func); }
	else { reg[func] = events[func]; }
}

// #############################################################################
// #### ON(DOM)LOAD ACTIONS ####################################################
// #############################################################################

/*
Add actions to run onload:
- reg.preSetup(func)
- reg.setup(selString, func, firstTimeOnly)
- reg.postSetup(func)

!!! WARNING !!!
On browsers *without* native querySelector() support
reg.setup makes page load time O(MN)
where M is the number of calls to reg.setup()
and N is the number of elements on the page
*/

// these contain lists of things to do
var preSetupQueue=[];
var setupQueue={};
var postSetupQueue=[];

// traverse and act onload
reg.setup=function(selector, setup, firstTimeOnly){
	firstTimeOnly=(firstTimeOnly)?true:false;
	var sq=setupQueue;
	var parsedSel = new reg.Selector(selector);
	var tagNames=getTagNames(parsedSel);
	var regObj={
		selector:parsedSel,
		setup:setup,
		ran:false,
		firstTimeOnly:firstTimeOnly
	};
	for(var a=0;a<tagNames.length;a++){
		var tagName = tagNames[a];
		if(!sq[tagName]){sq[tagName]=[regObj];}
		else{sq[tagName].push(regObj);}
	}
};
// do this before setup
reg.preSetup=function(fn){preSetupQueue.push(fn);};
// do this after setup
reg.postSetup=function(fn){postSetupQueue.push(fn);};

// (re)run setup functions
var runSetupFunctions = reg.rerun = function(el, noClobber){
	function runIt(el, regObj){
		regObj.setup.call(el);
		regObj.ran=true;
	}
	var start = new Date().getTime();
	if (typeof el.clobberable != 'undefined' && el.clobberable && noClobber) { return; }
	var doc=(el)?el:document;
	var sq=setupQueue;
	var sqIsEmpty=true;
	for (var tagName in sq) {
		if(!sq.hasOwnProperty(tagName)) { continue; }
		sqIsEmpty = false;
		break;
	}

	if (el.querySelector) {

		//####################################
		//querySelector() branch

		var qSelResults = [];
		for (var tagName in sq) {
			if(!sq.hasOwnProperty(tagName)) { continue; }
			var regObjArray = sq[tagName];
			for (var i=0; i<regObjArray.length; i++) {
				var regObj = regObjArray[i];
				if (regObj.firstTimeOnly) {
					if (regObj.ran) { continue; }
					try {
						var elmt = el.querySelector(toQuerySelectorString(regObj.selector));
						if (elmt) { qSelResults.push({el:elmt,regObj:regObj}); }
					} catch (ex) {
						console.log("querySelector('"+toQuerySelectorString(regObj.selector)+"') threw "+ex);
						continue;
					}
				} else {
					try {
						var elmts = el.querySelectorAll(toQuerySelectorString(regObj.selector));
						for (var j=0; j<elmts.length; j++) {
							qSelResults.push({el:elmts[j],regObj:regObj});
						}
					} catch (ex) {
						console.log("querySelectorAll('"+toQuerySelectorString(regObj.selector)+"') threw "+ex);
						continue;
					}
				}
			}
		}
		for (var i=0; i<qSelResults.length; i++) {
			runIt(qSelResults[i].el, qSelResults[i].regObj);
		}
	} else if (!sqIsEmpty) {

		//####################################
		//old branch

		var elsList=getElementsByTagName('*',doc);

		//dump live list to static list
		for (var i=elsList.length-1, els=[]; i>=0; i--) {
			els[i] = elsList[i];
		}

		// crawl the dom
		for(var a=0,elmt;elmt=els[a++];){
			if (elmt.nodeType!=1){continue;}//for ie7
			var lcNodeName=elmt.nodeName.toLowerCase();
			var regObjArrayAll=sq['*'];
			var regObjArrayTag=sq[lcNodeName];

			// any wildcards?
			if(regObjArrayAll){
				for(var b=0;b<regObjArrayAll.length;b++){
					var regObj=regObjArrayAll[b];
					if(regObj.firstTimeOnly && regObj.ran){continue;}
					var matches = regObj.selector.matches(elmt);
					if(matches){runIt(elmt, regObj);}
				}
			}

			// any items match this specific tag?
			if(regObjArrayTag){
				for(var b=0;b<regObjArrayTag.length;b++){
					var regObj=regObjArrayTag[b];
					if(regObj.firstTimeOnly && regObj.ran){continue;}
					var matches = regObj.selector.matches(elmt);
					if(matches){runIt(elmt, regObj);}
				}
			}
		}
	}
	el.clobberable = true;
	var runtime = new Date().getTime() - start;
	if(!reg.setupTime){ reg.setupTime=runtime; }
	reg.lastSetupTime=runtime;
}

var ie6 = navigator.appVersion.indexOf('MSIE 6.0') != -1;
if (!ie6) {
	addClassName(document.documentElement, 'regloading');
}
var loadFuncRan = false;
function loadFunc(e) {
	if (!loadFuncRan) {
		for(var a=0;a<preSetupQueue.length;a++){
			preSetupQueue[a]();
		}
		runSetupFunctions(document, true);
		for(var a=0;a<postSetupQueue.length;a++){
			postSetupQueue[a]();
		}
		loadFuncRan = true;
		if (!ie6) {
			// unfortunately this causes hangs and laborious redraws in ie6
			removeClassName(document.documentElement, 'regloading');
			addClassName(document.documentElement, 'regloaded');
		}
	}
}

// contents of loadFunc only execute once, this sidesteps user agent sniffing
addEvent(window, 'load', loadFunc);
addEvent(window, 'DOMContentLoaded', loadFunc);

// #############################################################################
// #### EVENT DELEGATION #######################################################
// #############################################################################

/*
The main purpose of reglib is event delegation:
- reg.click(selString, handler, depth)
- reg.hover(selString, overHandler, outHandler, depth)
- reg.focus(selString, focusHandler, blurHandler, depth)
- reg.key(selString, downHandler, pressHandler, upHandler, depth)
- reg.submit(selString, handler, depth)
- reg.reset(selString, handler, depth)
- reg.change(selString, handler, depth)
- reg.select(selString, handler, depth)

delegated events are active before page load, and remain
active throughout arbitrary rewrites of the DOM.
*/

// these contain the event handling functions
var clickHandlers = {};
var mDownHandlers = {};
var mUpHandlers = {};
var dblClickHandlers = {};
var mOverHandlers = {};
var mOutHandlers = {};
var focusHandlers = {};
var blurHandlers = {};
var keyDownHandlers = {};
var keyPressHandlers = {};
var keyUpHandlers = {};
var submitHandlers = {};
var resetHandlers = {};
var changeHandlers = {};
var selectHandlers = {};

// returns first arg that's a number
function getDepth(fargs){
	var result = null;
	for (var i=2; i<fargs.length; i++) {
		if (!isNaN(parseInt(fargs[i]))) {
			result = fargs[i];
			break;
		}
	}
	if(result===null){result=-1;}
	if(result<-1){throw new Error("bad arg for depth, must be -1 or higher");}
	return result;
}

// add a handler function
function pushFunc(selStr, handlerFunc, depth, handlers, hoverFlag) {
	if(!handlerFunc || typeof handlerFunc != "function"){return;}
	var parsedSel = new reg.Selector(selStr);
	if(!handlers[selStr]) {handlers[selStr]=[];}
	var selHandler = {
		selector:parsedSel,
		handle:handlerFunc,
		depth:depth,
		hoverFlag:hoverFlag
	};
	handlers[selStr].push(selHandler);
}

reg.click=function(selStr, clickFunc, downFunc, upFunc, doubleFunc){
	var depth = getDepth(arguments);
	pushFunc(selStr, clickFunc,  depth, clickHandlers,    false);
	pushFunc(selStr, downFunc,   depth, mDownHandlers,    false);
	pushFunc(selStr, upFunc,     depth, mUpHandlers,      false);
	pushFunc(selStr, doubleFunc, depth, dblClickHandlers, false);
};
reg.hover=function(selStr, overFunc, outFunc){
	var depth = getDepth(arguments);
	pushFunc(selStr, overFunc, depth, mOverHandlers, true);
	pushFunc(selStr, outFunc,  depth, mOutHandlers,  true);
};
reg.focus=function(selStr, focusFunc, blurFunc){
	var depth = getDepth(arguments);
	pushFunc(selStr, focusFunc, depth, focusHandlers, false);
	pushFunc(selStr, blurFunc,  depth, blurHandlers,  false);
};
reg.key=function(selStr, downFunc, pressFunc, upFunc){
	var depth = getDepth(arguments);
	pushFunc(selStr, downFunc,  depth, keyDownHandlers,  false);
	pushFunc(selStr, pressFunc, depth, keyPressHandlers, false);
	pushFunc(selStr, upFunc,    depth, keyUpHandlers,    false);
};

// workaround for IE's lack of support for bubbling on form events
// set delegation directly on the element in question by co-opting
// the focus event which is guaranteed to happen first
if (document.all && !window.opera) {
	function ieSubmitDelegate(e) {
		delegate(submitHandlers,e);
		cancelBubble(e);
	};
	function ieResetDelegate(e) {
		delegate(resetHandlers,e);
		cancelBubble(e);
	};
	function ieChangeDelegate(e) {
		delegate(changeHandlers,e);
		cancelBubble(e);
	};
	function ieSelectDelegate(e) {
		delegate(selectHandlers,e);
		cancelBubble(e);
	};
	reg.focus('form',function(){
		removeEvent(this._submit_prep);
		this._submit_prep=addEvent(this,'submit',ieSubmitDelegate,false,true);
		removeEvent(this._reset_prep);
		this._reset_prep=addEvent(this,'reset',ieResetDelegate,false,true);
	},function(){
		removeEvent(this._submit_prep);
		removeEvent(this._reset_prep);
	});
	reg.focus('select,input,textarea',function(){
		removeEvent(this._change_prep);
		this._change_prep=addEvent(this,'change',ieChangeDelegate,false,true);
	},function(){
		removeEvent(this._change_prep);
	});
	reg.focus('input,textarea',function(){
		removeEvent(this._select_prep);
		this._select_prep=addEvent(this,'select',ieSelectDelegate,false,true);
	},function(){
		removeEvent(this._select_prep);
	});
}

reg.submit=function(selStr, func) {
	var depth = getDepth(arguments);
	pushFunc(selStr, func, depth, submitHandlers, false);
};
reg.reset=function(selStr, func) {
	var depth = getDepth(arguments);
	pushFunc(selStr, func, depth, resetHandlers, false);
};
reg.change=function(selStr, func) {
	var depth = getDepth(arguments);
	pushFunc(selStr, func, depth, changeHandlers, false);
};
reg.select=function(selStr, func) {
	var depth = getDepth(arguments);
	pushFunc(selStr, func, depth, selectHandlers, false);
};

// the delegator
function delegate(selectionHandlers, event) {
	if (selectionHandlers) {
		var targ = getTarget(event);
		for (var sel in selectionHandlers) {
			if(!selectionHandlers.hasOwnProperty(sel)) { continue; }
			for(var a=0; a<selectionHandlers[sel].length; a++) {
				var selHandler=selectionHandlers[sel][a];
				var depth = (selHandler.depth==-1) ? 100 : selHandler.depth;
				var el = targ;
				for (var b=-1; b<depth && el && el.nodeType == 1; b++, el=el.parentNode) {
					if (selHandler.selector.matches(el)) {
						// replicate mouse enter/leave
						if (selHandler.hoverFlag) {
							var relTarg = getRelatedTarget(event);
							if (relTarg && (el.contains(relTarg) || el == relTarg)) {
								break;
							}
						}
						var retVal=selHandler.handle.call(el,event);
						// if they return false from the handler, cancel default
						if(retVal!==undefined && !retVal) {
							cancelDefault(event);
						}
						break;
					}
				}
			}
		}
	}
}

if(typeof document.onactivate == 'object'){
	var focusEventType = 'activate';
	var blurEventType = 'deactivate';
}else{
	var focusEventType = 'focus';
	var blurEventType = 'blur';
}

// attach the events
addEvent(document.documentElement,'click',        function(e){delegate(clickHandlers,   e);});
addEvent(document.documentElement,'mousedown',    function(e){delegate(mDownHandlers,   e);});
addEvent(document.documentElement,'mouseup',      function(e){delegate(mUpHandlers,     e);});
addEvent(document.documentElement,'dblclick',     function(e){delegate(dblClickHandlers,e);});
addEvent(document.documentElement,'keydown',      function(e){delegate(keyDownHandlers, e);});
addEvent(document.documentElement,'keypress',     function(e){delegate(keyPressHandlers,e);});
addEvent(document.documentElement,'keyup',        function(e){delegate(keyUpHandlers,   e);});
addEvent(document.documentElement,focusEventType, function(e){delegate(focusHandlers,   e);},true);
addEvent(document.documentElement,blurEventType,  function(e){delegate(blurHandlers,    e);},true);
addEvent(document.documentElement,'mouseover',    function(e){delegate(mOverHandlers,   e);});
addEvent(document.documentElement,'mouseout',     function(e){delegate(mOutHandlers,    e);});
addEvent(document.documentElement,'submit',       function(e){delegate(submitHandlers,  e);});
addEvent(document.documentElement,'reset',        function(e){delegate(resetHandlers,   e);});
addEvent(document.documentElement,'change',       function(e){delegate(changeHandlers,  e);});
addEvent(document.documentElement,'select',       function(e){delegate(selectHandlers,  e);});

// handy for css
addClassName(document.documentElement, 'regenabled');

// #############################################################################
// #### CONSOLE.LOG BACKUP #####################################################
// #############################################################################

/*
For backwards compatibility.
Allows console.log() to be called in old clients without errors.
in which case console.contents() fetches logged messages.
*/

var logMessages = [];
var log = function(str) { logMessages.push(str); };
var contents = function() { return logMessages.join("\n")+"\n"; };
if (!window.console) { window.console = { log : log, contents : contents }; }
else {
	if (!window.console.log) {
		window.console.log = log;
		if (!window.console.contents) { window.console.contents = contents; }
	}
}

// #############################################################################
// #### AND... DONE. ###########################################################
// #############################################################################

return reg;

})();

