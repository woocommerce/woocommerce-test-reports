var acc = document.getElementsByClassName('accordion');
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener('click', function () {
    this.classList.toggle('active');
    var panel = this.nextElementSibling;
    var style = panel.style;
    var current_maxHeight = style.maxHeight;
    console.log(`current_maxHeight: ${current_maxHeight}`);
    console.log(`panel.scrollHeight: ${panel.scrollHeight}`);
    if (current_maxHeight) {
      panel.style.maxHeight = null;
    } else {
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });
}
