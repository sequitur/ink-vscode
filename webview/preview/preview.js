/*
 * Parts of this script were heavily borrowed from inkjs.
 *
 * inkjs is licensed under the MIT licence.
 * Copyright (c) 2017 Yannick Lohse.
 *
 * https://github.com/y-lohse/inkjs
 */

require('./preview.css');

const ink = {
    vscode: undefined,
    storyContainer: document.querySelectorAll('#story')[0],
    currentDelay: 0,
    removeChoiceOnNextUpdate: false
}

function showAfter(delay, el) {
    setTimeout(function() { el.classList.add("show") }, delay);
}

function scrollToBottom() {
    const start = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const dist = document.body.scrollHeight - window.innerHeight - start;
    if( dist < 0 ) return;

    const duration = 300 + 300*dist/100;
    let startTime = null;
    function step(time) {
        if( startTime == null ) startTime = time;
        const t = (time-startTime) / duration;
        const lerp = 3*t*t - 2*t*t*t;
        window.scrollTo(0, start + lerp*dist);
        if( t < 1 ) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function renderText(text) {
    var paragraphElement = document.createElement('p');
    paragraphElement.innerHTML = text;
    ink.storyContainer.appendChild(paragraphElement);

    // Fade in paragraph after a short delay
    showAfter(ink.currentDelay, paragraphElement);

    ink.currentDelay += 200.0;
}

function renderTags(tags) {
    for (tag of tags) {
        var tagElement = document.createElement('p');
        tagElement.innerHTML = "# " + tag;
        tagElement.classList.add('tag');
        ink.storyContainer.appendChild(tagElement);

        showAfter(ink.currentDelay, tagElement);
        ink.currentDelay += 200.0;
    }
}

function renderChoice(choice) {
    // Create paragraph with anchor element
    var choiceParagraphElement = document.createElement('p');
    choiceParagraphElement.classList.add("choice");
    choiceParagraphElement.innerHTML = `<a href='#'>${choice.text}</a>`
    ink.storyContainer.appendChild(choiceParagraphElement);

    // Fade choice in after a short delay
    showAfter(ink.currentDelay, choiceParagraphElement);
    ink.currentDelay += 200.0;

    // Click on choice
    var choiceAnchorEl = choiceParagraphElement.querySelectorAll("a")[0];
    choiceAnchorEl.addEventListener("click", (clickEvent) => {

        // Don't follow <a> link
        clickEvent.stopImmediatePropagation();
        clickEvent.preventDefault();

        ink.removeChoiceOnNextUpdate = true;

        ink.vscode.postMessage({
            type: 'selectOption',
            optionIndex: choice.index,
        })
    });
}

function renderEndOfStory() {
    var tagElement = document.createElement('p');
    tagElement.innerHTML = "End of story";
    tagElement.classList.add('end-of-story');
    ink.storyContainer.appendChild(tagElement);

    showAfter(ink.currentDelay, tagElement);
    ink.currentDelay += 200.0;
}

window.addEventListener('message', messageEvent => {
    const message = messageEvent.data;

    if (message.command !== 'render') { return; }

    removeChoices();

    switch(message.type) {
    case 'text':
        renderText(message.content);
        break;
    case 'tag':
        renderTags(message.content);
        break;
    case 'choice':
        renderChoice(message.content);
        break;
    case 'endOfStory':
        renderEndOfStory();
        scrollToBottom();
        break;
    case 'prompt':
        ink.currentDelay = 0;
        scrollToBottom();
        break;
    }
});

function removeChoices() {
    if (ink.removeChoiceOnNextUpdate) {
        ink.removeChoiceOnNextUpdate = false

        // Remove all existing choices
        var existingChoices = ink.storyContainer.querySelectorAll('p.choice');
        for (var i=0; i<existingChoices.length; i++) {
            var c = existingChoices[i];
            c.classList.remove("show");
        }
    }
}

window.onload = function () {
    ink.vscode = acquireVsCodeApi();
}
