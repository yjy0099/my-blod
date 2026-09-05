let tag = document.querySelector(".backTop")
    window.onscroll = function(){
        //  获取滚动条位置
        let pos = this.scrollY;
        if (pos >= 300){
            tag.style.display = "block";
        }else{
            tag.style.display = "none"
        }
    }
    tag.addEventListener("click", function(event){
        window.scrollTo({
            left:0,
            top: 0,
            behavior: "smooth"
        })
    })