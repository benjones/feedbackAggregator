const selectedRevieweeId = 'currentReviewee';
const selectedReviewerId = 'currentReviewer';

function currentReviewee(){
    return document.getElementById(selectedRevieweeId).textContent;
}

function updateReviewCount(element){
    let reviewerName = element.querySelector('.reviewerName').textContent;
    let params = new URLSearchParams({"reviewer" : reviewerName});
    let url = "/review_count?" + params.toString();
    let xhr = new XMLHttpRequest();
    console.log(url);
    xhr.open("GET", url);
    xhr.addEventListener("load", function(event){
        console.log(xhr.response);
        element.querySelector('.reviewCount').innerText = `${xhr.response} reviews`;
    });
    xhr.send();
}



function loadReviews(){
    var xhr = new XMLHttpRequest();
    let params = new URLSearchParams({ "reviewee" : document.getElementById(selectedRevieweeId).textContent });
    let url = "/reviews?" + params.toString();
    console.log(url);
    xhr.open("GET", url);

    xhr.addEventListener("load", function(event){
        console.log("get reviews response", xhr.status);
        console.log(event);
        console.log(xhr.response);


        let holder = document.getElementById('reviewContainer');
        holder.innerHTML = "";

        let reviews = JSON.parse(xhr.response);
        console.log(reviews);
        for(let review of reviews){
            console.log(review);
            let d = document.createElement('div');
            d.classList.add('review');
            let p = document.createElement('p');
            p.classList.add('reviewText');
            p.appendChild(document.createTextNode(review.review));
            d.appendChild(p);

            let deleter = document.createElement('p');
            deleter.classList.add('deleter');
            deleter.appendChild(document.createTextNode("delete review"));
            deleter.dataset.reviewID = review._id;
            d.appendChild(deleter);

            deleter.addEventListener("click", function(event){
                let n = event.target;
                n.classList.remove('deleter');
                n.classList.add('realDeleter');
                n.innerHTML = "Really delete review";
                console.log(event);

                n.addEventListener("click", function(event){
                    console.log("really delete");

                    let dxhr = new XMLHttpRequest();
                    dxhr.open('POST', '/delete_review');
                    dxhr.addEventListener('load', function(event){
                        console.log("got delete post response ", dxhr.status);
                        console.log(dxhr.response);
                        loadReviews();
                        updateReviewCount(document.getElementById(selectedReviewerId));

                    });

                    console.log(n);
                    console.log(n.dataset);

                    dxhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                    dxhr.send(JSON.stringify({
                        'reviewee' : currentReviewee(),
                        'id' : n.dataset.reviewID
                    }));

                });

            }, {once: true});


            holder.appendChild(d);
        }

    });
    xhr.addEventListener("error", function(event){
        console.log("got get reviews error response", xhr.status);
        console.log(event);
    });

    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send();

}


window.onload = function(){
    console.log("hello js");

    document.getElementById('reviewForm').addEventListener('submit',function(event){
        console.log("form submitted");

        event.preventDefault();

        let data = new FormData(document.getElementById("reviewForm"));
        console.log("form data: ");
        for(let pair of data.entries()) {
            console.log(pair);
        }
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/new_review");

        xhr.addEventListener("load", function(event){
            console.log("got submission response", xhr.status);
            console.log(event);
            document.getElementById('newReview').value = '';
            loadReviews();
            updateReviewCount(document.getElementById(selectedReviewerId));
        });
        xhr.addEventListener("error", function(event){
            console.log("got error response", xhr.status);
            console.log(event);
        });

        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify({
            "review" : data.get("newReview"),
            "reviewer" : document.getElementById(selectedReviewerId).querySelector('.reviewerName').textContent,
            "reviewee" : document.getElementById(selectedRevieweeId).textContent
        }));




    });


    let reviewees = document.getElementById('reviewees');
    reviewees.children[0].setAttribute('id', selectedRevieweeId);
    for(let reviewee of reviewees.children){
        reviewee.addEventListener('click', function(event){
            console.log(event);

            let currentSelected = document.getElementById(selectedRevieweeId);
            if(currentSelected){
                currentSelected.removeAttribute('id');
            }
            event.target.setAttribute('id', selectedRevieweeId);

            loadReviews();
        });
    }


    let reviewers = document.getElementById('reviewers');
    reviewers.children[0].setAttribute('id', selectedReviewerId);
    updateReviewCount(reviewers.children[0]);
    for(let reviewer of reviewers.children){
        reviewer.addEventListener('click', function(event){
//            console.log(event);
            console.log(reviewer);

            let currentSelected = document.getElementById(selectedReviewerId);
            if(currentSelected){
                currentSelected.removeAttribute('id');
            }
            reviewer.setAttribute('id', selectedReviewerId);
            console.log(reviewer.querySelector('.reviewerName'));
            updateReviewCount(reviewer);
        });
    }

    document.getElementById('copyToClipboard').addEventListener('click', function(Event){
        let reviews = document.getElementsByClassName('review');
        let allReviews = Array.from(reviews).map(function(review){
            return review.children[0].textContent;
        }).join("\n\n");
        console.log(allReviews);

        navigator.clipboard.writeText(allReviews).then(function() {
            console.log('Async: Copying to clipboard was successful!');
        }, function(err) {
            console.error('Async: Could not copy text: ', err);
        });


    });

    loadReviews();

}
