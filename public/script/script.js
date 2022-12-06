$(document).ready(function(){
    // 메뉴바 > 검색
    $('#search').click(function(){
        let search_value = $('#search_input').val();
        window.location.replace('/search?value=' + search_value);
    });

    // 상세화면 > 삭제버튼 클릭
    $('#btn_delete').click(function(e){
        $.ajax({
            method : 'DELETE',
            url : '/delete',
            data : { _id : e.target.dataset.id }
        }).done((res) => {
            if(res.msg == 'success'){
                alert(res.msg);
                location.href='/list';
            }else{
                alert('삭제실패! 아이디 확인要');
                location.href='/login';
            }
        }).fail((xhr, textStatus, errorThrown) => {
            console.log(xhr, textStatus, errorThrown);
        });
    });

})
