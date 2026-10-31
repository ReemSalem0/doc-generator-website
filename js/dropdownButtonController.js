'use strict';

const dropdownMenu = document.getElementById("saveOptionsDropDown");
const saveBtn = document.querySelector(".saveBtn");

saveBtn.addEventListener("click", () => {

    dropdownMenu.classList.toggle("show");

  });

// Function to close the drop down once the user click outside of the menu
document.addEventListener("click", e =>{
    if(!dropdownMenu.contains(e.target) && !saveBtn.contains(e.target)){
        dropdownMenu.classList.remove("show");
    }
});