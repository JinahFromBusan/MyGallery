$(document).ready(function(){
    // 메뉴바 > 검색
    $('#search').click(function(){
        let search_value = $('#search_input').val();
        window.location.replace('/search?value=' + search_value);
    });
    // 상세화면 > 수정, 삭제버튼 설정
    

    // 상세화면 > 삭제버튼 클릭
    $('#btn_delete').click(function(e){
        $.ajax({
            method : 'DELETE',
            url : '/delete',
            data : { _id : e.target.dataset.id }
        }).done((res) => {
            alert("삭제되었습니다.");
        }).fail((xhr, textStatus, errorThrown) => {
            console.log(xhr, textStatus, errorThrown);
        });
    });
    // 로그인 화면 
    // $('#join_form').css('display', 'none');
    // $('#btn_join').click(function(){
    //     $('#join_form').css('display', 'block');
    //     $('#login_form').css('display', 'none');
    // })
})
