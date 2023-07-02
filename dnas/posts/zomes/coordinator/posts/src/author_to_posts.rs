use hdk::prelude::*;
use posts_integrity::*;

#[derive(Serialize, Deserialize, Debug)]
pub struct AddPostForAuthorInput {
    pub base_author: AgentPubKey,
    pub target_post_hash: ActionHash,
}
#[hdk_extern]
pub fn add_post_for_author(input: AddPostForAuthorInput) -> ExternResult<()> {
    create_link(input.base_author.clone(), input.target_post_hash.clone(), LinkTypes::AuthorToPosts, ())?;
    

    Ok(())    
}

#[hdk_extern]
pub fn get_posts_for_author(author: AgentPubKey) -> ExternResult<Vec<Record>> {
    let links = get_links(author, LinkTypes::AuthorToPosts, None)?;
    
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(ActionHash::from(link.target).into(), GetOptions::default()))
        .collect();

    // Get the records to filter out the deleted ones
    let records: Vec<Record> = HDK.with(|hdk| hdk.borrow().get(get_input))?
        .into_iter()
        .filter_map(|r| r)
        .collect();

    Ok(records)
}

        
#[derive(Serialize, Deserialize, Debug)]
pub struct RemovePostForAuthorInput {
    pub base_author: AgentPubKey,
    pub target_post_hash: ActionHash,
}
#[hdk_extern]
pub fn remove_post_for_author(input: RemovePostForAuthorInput ) -> ExternResult<()> {
    let links = get_links(input.base_author.clone(), LinkTypes::AuthorToPosts, None)?;
    
    for link in links {
        if ActionHash::from(link.target.clone()).eq(&input.target_post_hash) {
            delete_link(link.create_link_hash)?;
        }
    }
    

    Ok(())        
}