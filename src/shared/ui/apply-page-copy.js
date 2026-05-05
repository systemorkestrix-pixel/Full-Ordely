function setElementValue(element, attribute, value) {
  if (attribute === "text") {
    element.textContent = value;
    return;
  }

  if (attribute === "html") {
    element.innerHTML = value;
    return;
  }

  if (attribute === "value") {
    element.value = value;
    return;
  }

  element.setAttribute(attribute, value);
}

function applyDeclarativeCopy(textMap) {
  const attributeBindings = [
    ["data-copy", "text"],
    ["data-copy-html", "html"],
    ["data-copy-value", "value"],
    ["data-copy-placeholder", "placeholder"],
    ["data-copy-aria-label", "aria-label"],
    ["data-copy-title", "title"],
    ["data-copy-alt", "alt"],
  ];

  attributeBindings.forEach(([dataAttribute, targetAttribute]) => {
    document.querySelectorAll(`[${dataAttribute}]`).forEach((element) => {
      const key = element.getAttribute(dataAttribute);
      const value = textMap?.[key];

      if (typeof value !== "string" || !key) {
        return;
      }

      setElementValue(element, targetAttribute, value);
    });
  });
}

export function applyPageCopy(textMap, bindings = []) {
  if (textMap?.documentTitle) {
    document.title = textMap.documentTitle;
  }

  applyDeclarativeCopy(textMap);

  bindings.forEach((binding) => {
    const {
      selector,
      key,
      attribute = "text",
    } = binding;

    const value = textMap?.[key];
    if (typeof value !== "string" || !selector) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      setElementValue(element, attribute, value);
    });
  });
}
