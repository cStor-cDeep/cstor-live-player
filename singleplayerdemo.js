import Vue from 'vue';
import SinglePlayerDemo from './singleplayerdemo.vue';
import QueryString from 'querystring';
import '@/fontawesome-icons';

const qs = location.search.length > 1 ? QueryString.parse(location.search.substr(1)) : {};
const el = document.createElement('div');
document.body.appendChild(el);

new Vue({
    el,
    render: h => h(SinglePlayerDemo,{
        props: {
            src: qs.src
        }
    })
});
